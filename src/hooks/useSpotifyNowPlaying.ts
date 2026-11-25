import { useCallback, useEffect, useState } from 'react';
import {
  getNativeSpotifyNowPlaying,
  isNativeAndroid,
  openSpotifyNotificationSettings,
  subscribeNativeSpotifyPlayback,
} from '../native/launcherBridge';
import type { SpotifyNowPlaying } from '../types/launcher';

export interface SpotifyWebStatus {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
}

export function useSpotifyNowPlaying(isScreensaverActive: boolean) {
  const isNative = isNativeAndroid();
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(null);
  const [webStatus, setWebStatus] = useState<SpotifyWebStatus>({
    configured: false,
    connected: false,
  });

  const refreshSpotify = useCallback(async () => {
    // 1. En Android TV nativo: consultar MediaSession + Broadcasts de Spotify
    if (isNative) {
      const nativeState = await getNativeSpotifyNowPlaying();
      if (nativeState) {
        setNowPlaying(nativeState);
        return;
      }
    }

    // 2. En Web / PC: consultar API del servidor si está conectado con OAuth
    if (!isNative) {
      try {
        const res = await fetch('/api/spotify/currently-playing', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as SpotifyNowPlaying & { connected?: boolean };
          setWebStatus((prev) => ({
            ...prev,
            connected: Boolean(data.connected),
          }));
          if (data.connected) {
            setNowPlaying({
              isPlaying: Boolean(data.isPlaying && data.track),
              track: data.track || '',
              artist: data.artist || '',
              album: data.album || '',
              albumArt: data.albumArt || '',
              source: 'spotify-api',
            });
            return;
          }
        }
      } catch {
        // Silencioso si no hay backend o sin conexión
      }

      // 3. Fallback navegador: MediaSession del propio navegador si reproduce audio
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        const meta = navigator.mediaSession.metadata;
        const playbackState = navigator.mediaSession.playbackState;
        if (meta?.title && playbackState === 'playing') {
          setNowPlaying({
            isPlaying: true,
            track: meta.title,
            artist: meta.artist || '',
            album: meta.album || '',
            albumArt: meta.artwork?.[0]?.src || '',
            source: 'browser-media',
          });
          return;
        }
      }
    }
  }, [isNative]);

  const fetchWebConfig = useCallback(async () => {
    if (isNative) return;
    try {
      const res = await fetch('/api/spotify/status', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as SpotifyWebStatus;
        setWebStatus(data);
      }
    } catch {
      // Silencioso
    }
  }, [isNative]);

  // Suscripción nativa en tiempo real + escucha de OAuth popup
  useEffect(() => {
    void fetchWebConfig();
    void refreshSpotify();

    let unsubNative: (() => void) | null = null;
    if (isNative) {
      void subscribeNativeSpotifyPlayback((state) => {
        setNowPlaying(state);
      }).then((unsub) => {
        unsubNative = unsub;
      });
    }

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'SPOTIFY_OAUTH_SUCCESS') {
        void fetchWebConfig();
        void refreshSpotify();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      if (unsubNative) unsubNative();
      window.removeEventListener('message', handleMessage);
    };
  }, [fetchWebConfig, isNative, refreshSpotify]);

  // Polling periódico: cada 4s cuando el salvapantallas está abierto, cada 15s en segundo plano
  useEffect(() => {
    const intervalMs = isScreensaverActive ? 4_000 : 15_000;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshSpotify();
      }
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [isScreensaverActive, refreshSpotify]);

  const connectSpotify = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/spotify/url', { credentials: 'include' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        return {
          ok: false,
          error: data.error || 'No se pudo obtener la URL de autorización de Spotify.',
        };
      }

      const authWindow = window.open(
        data.url,
        'spotify_oauth_popup',
        'width=520,height=720'
      );
      if (!authWindow) {
        return {
          ok: false,
          error: 'Permite las ventanas emergentes para conectar tu cuenta de Spotify.',
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Error conectando con Spotify.' };
    }
  }, []);

  const disconnectSpotify = useCallback(async () => {
    try {
      await fetch('/api/spotify/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignorar
    }
    setWebStatus((prev) => ({ ...prev, connected: false }));
    setNowPlaying(null);
  }, []);

  const openAndroidSpotifyPermission = useCallback(async () => {
    return openSpotifyNotificationSettings();
  }, []);

  return {
    nowPlaying,
    webStatus,
    connectSpotify,
    disconnectSpotify,
    refreshSpotify,
    openAndroidSpotifyPermission,
  };
}
