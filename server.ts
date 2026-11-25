import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

interface SpotifyTokenSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const spotifySessions = new Map<string, SpotifyTokenSession>();
const pendingOAuthStates = new Map<string, number>();

const COOKIE_NAME = 'vora_spotify_sid';

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

function getAppBaseUrl(): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl.replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

function getSpotifyRedirectUri(): string {
  return `${getAppBaseUrl()}/auth/spotify/callback`;
}

function getSpotifyClientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function setSessionCookie(req: Request, res: Response, sid: string): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    getAppBaseUrl().startsWith('https://');

  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    getAppBaseUrl().startsWith('https://');

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
}

async function refreshSpotifyAccessToken(
  session: SpotifyTokenSession,
  clientId: string,
  clientSecret: string
): Promise<SpotifyTokenSession | null> {
  if (!session.refreshToken) return null;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    return null;
  }

  const data = (await resp.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/spotify/status', (req: Request, res: Response) => {
    const creds = getSpotifyClientCredentials();
    const cookies = parseCookies(req);
    const sid = cookies[COOKIE_NAME];
    const connected = Boolean(sid && spotifySessions.has(sid));
    res.json({
      configured: Boolean(creds),
      connected,
      redirectUri: getSpotifyRedirectUri(),
    });
  });

  app.get('/api/auth/spotify/url', (_req: Request, res: Response) => {
    const creds = getSpotifyClientCredentials();
    if (!creds) {
      res.status(503).json({
        error: 'SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET no están configurados.',
      });
      return;
    }

    const state = crypto.randomBytes(16).toString('hex');
    pendingOAuthStates.set(state, Date.now() + 10 * 60 * 1000);

    // Limpiar estados expirados
    const now = Date.now();
    for (const [k, exp] of pendingOAuthStates.entries()) {
      if (exp < now) pendingOAuthStates.delete(k);
    }

    const params = new URLSearchParams({
      client_id: creds.clientId,
      response_type: 'code',
      redirect_uri: getSpotifyRedirectUri(),
      scope: 'user-read-currently-playing user-read-playback-state',
      state,
      show_dialog: 'true',
    });

    res.json({
      url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    });
  });

  const handleSpotifyCallback = async (req: Request, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    if (oauthError || !code) {
      res.status(400).send(`
        <html>
          <body style="font-family:sans-serif;background:#0b0e14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <p>No se completó la conexión con Spotify.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'SPOTIFY_OAUTH_ERROR', error: ${JSON.stringify(oauthError || 'missing_code')} }, '*');
                  window.close();
                }
              </script>
            </div>
          </body>
        </html>
      `);
      return;
    }

    const expectedExp = pendingOAuthStates.get(state);
    if (!state || !expectedExp || expectedExp < Date.now()) {
      res.status(400).send('Invalid or expired OAuth state.');
      return;
    }
    pendingOAuthStates.delete(state);

    const creds = getSpotifyClientCredentials();
    if (!creds) {
      res.status(503).send('Spotify credentials missing on server.');
      return;
    }

    try {
      const authHeader = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSpotifyRedirectUri(),
      });

      const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody.toString(),
      });

      if (!tokenResp.ok) {
        res.status(400).send('Failed to exchange Spotify token.');
        return;
      }

      const tokenJson = (await tokenResp.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };

      if (!tokenJson.access_token || !tokenJson.refresh_token) {
        res.status(400).send('Incomplete token response from Spotify.');
        return;
      }

      const sid = crypto.randomUUID();
      spotifySessions.set(sid, {
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        expiresAt: Date.now() + ((tokenJson.expires_in || 3600) - 60) * 1000,
      });

      setSessionCookie(req, res, sid);

      res.send(`
        <html>
          <body style="font-family:sans-serif;background:#0b0e14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <p>Spotify conectado correctamente. Esta ventana se cerrará automáticamente.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'SPOTIFY_OAUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch {
      res.status(500).send('Error connecting Spotify.');
    }
  };

  app.get(['/auth/spotify/callback', '/auth/spotify/callback/'], handleSpotifyCallback);

  app.get('/api/spotify/currently-playing', async (req: Request, res: Response) => {
    const creds = getSpotifyClientCredentials();
    const cookies = parseCookies(req);
    const sid = cookies[COOKIE_NAME];
    let session = sid ? spotifySessions.get(sid) : undefined;

    if (!creds || !sid || !session) {
      res.json({
        connected: false,
        isPlaying: false,
        track: '',
      });
      return;
    }

    try {
      if (Date.now() >= session.expiresAt) {
        const refreshed = await refreshSpotifyAccessToken(session, creds.clientId, creds.clientSecret);
        if (!refreshed) {
          spotifySessions.delete(sid);
          clearSessionCookie(req, res);
          res.json({ connected: false, isPlaying: false, track: '' });
          return;
        }
        session = refreshed;
        spotifySessions.set(sid, refreshed);
      }

      const spResp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (spResp.status === 204) {
        res.json({
          connected: true,
          isPlaying: false,
          track: '',
          source: 'spotify-api',
        });
        return;
      }

      if (spResp.status === 401) {
        const refreshed = await refreshSpotifyAccessToken(session, creds.clientId, creds.clientSecret);
        if (!refreshed) {
          spotifySessions.delete(sid);
          clearSessionCookie(req, res);
          res.json({ connected: false, isPlaying: false, track: '' });
          return;
        }
        spotifySessions.set(sid, refreshed);
        const retryResp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        });
        if (!retryResp.ok || retryResp.status === 204) {
          res.json({ connected: true, isPlaying: false, track: '', source: 'spotify-api' });
          return;
        }
        const retryData = await retryResp.json();
        res.json(formatSpotifyPayload(retryData));
        return;
      }

      if (!spResp.ok) {
        res.json({ connected: true, isPlaying: false, track: '', source: 'spotify-api' });
        return;
      }

      const data = await spResp.json();
      res.json(formatSpotifyPayload(data));
    } catch {
      res.json({ connected: true, isPlaying: false, track: '', source: 'spotify-api' });
    }
  });

  app.post('/api/spotify/disconnect', (req: Request, res: Response) => {
    const cookies = parseCookies(req);
    const sid = cookies[COOKIE_NAME];
    if (sid) {
      spotifySessions.delete(sid);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VORA TV OS server running on http://0.0.0.0:${PORT}`);
  });
}

function formatSpotifyPayload(data: {
  is_playing?: boolean;
  item?: {
    name?: string;
    artists?: Array<{ name?: string }>;
    album?: {
      name?: string;
      images?: Array<{ url?: string }>;
    };
  } | null;
}) {
  const item = data?.item;
  const track = item?.name?.trim() || '';
  const artist = item?.artists
    ?.map((a) => a.name)
    .filter(Boolean)
    .join(', ');
  const album = item?.album?.name?.trim() || '';
  const albumArt = item?.album?.images?.[0]?.url || '';

  return {
    connected: true,
    isPlaying: Boolean(data?.is_playing && track),
    track,
    artist,
    album,
    albumArt,
    source: 'spotify-api' as const,
  };
}

void startServer();
