package com.cgamestv.launcher;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.AudioPlaybackConfiguration;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.app.Activity;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityManager;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Launcher")
public class LauncherPlugin extends Plugin {

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private static final Map<String, String> ICON_CACHE = new ConcurrentHashMap<>();
    private static WeakReference<LauncherPlugin> activeInstanceRef = null;

    private BroadcastReceiver spotifyBroadcastReceiver;
    private MediaSessionManager mediaSessionManager;
    private MediaSessionManager.OnActiveSessionsChangedListener activeSessionsListener;
    private MediaController activeSpotifyController;
    private MediaController.Callback activeSpotifyCallback;

    private volatile boolean broadcastPlaying = false;
    private volatile String broadcastTrack = "";
    private volatile String broadcastArtist = "";
    private volatile String broadcastAlbum = "";

    @Override
    public void load() {
        super.load();
        activeInstanceRef = new WeakReference<>(this);
        registerSpotifyReceivers();
        bindMediaSessionListener();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        bindMediaSessionListener();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterSpotifyReceivers();
        unbindMediaSessionListener();
        super.handleOnDestroy();
    }

    public static void onMediaListenerChanged(Context context) {
        LauncherPlugin plugin = activeInstanceRef != null ? activeInstanceRef.get() : null;
        if (plugin != null && context != null) {
            plugin.bindMediaSessionListener();
            plugin.emitCurrentSpotifyState(context.getApplicationContext());
        }
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        executor.execute(() -> {
            try {
                Context rawContext = getContext();
                if (rawContext == null) {
                    call.reject("Contexto Android no disponible");
                    return;
                }
                Context context = rawContext.getApplicationContext();
                PackageManager pm = context.getPackageManager();
                String selfPackage = context.getPackageName();

                Map<String, AppRecord> appMap = new LinkedHashMap<>();

                // 1. Consultar primero apps optimizadas para Android TV (LEANBACK_LAUNCHER) excluyendo apps del sistema
                Intent leanbackIntent = new Intent(Intent.ACTION_MAIN);
                leanbackIntent.addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
                List<ResolveInfo> leanbackApps = pm.queryIntentActivities(leanbackIntent, 0);
                for (ResolveInfo info : leanbackApps) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(selfPackage)) continue;
                    if (isHiddenSystemApp(info.activityInfo.applicationInfo, pkg)) continue;
                    appMap.putIfAbsent(pkg, buildAppRecord(pm, info, true));
                }

                // 2. Consultar apps estándar (LAUNCHER) para sideloads de usuario, excluyendo apps del sistema
                Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
                launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> standardApps = pm.queryIntentActivities(launcherIntent, 0);
                for (ResolveInfo info : standardApps) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(selfPackage)) continue;
                    if (isHiddenSystemApp(info.activityInfo.applicationInfo, pkg)) continue;
                    appMap.putIfAbsent(pkg, buildAppRecord(pm, info, false));
                }

                JSArray appsArray = new JSArray();
                for (AppRecord rec : appMap.values()) {
                    JSObject obj = new JSObject();
                    obj.put("packageName", rec.packageName);
                    obj.put("name", rec.name);
                    obj.put("icon", rec.iconDataUri);
                    obj.put("isLeanback", rec.isLeanback);
                    obj.put("isSystemApp", rec.isSystemApp);
                    obj.put("category", rec.category);
                    appsArray.put(obj);
                }

                JSObject result = new JSObject();
                result.put("apps", appsArray);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Error leyendo aplicaciones instaladas: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("Falta packageName");
            return;
        }

        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();

            Intent launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName);
            if (launchIntent == null) {
                launchIntent = pm.getLaunchIntentForPackage(packageName);
            }

            if (launchIntent == null) {
                JSObject res = new JSObject();
                res.put("launched", false);
                res.put("packageName", packageName);
                call.resolve(res);
                return;
            }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);

            JSObject res = new JSObject();
            res.put("launched", true);
            res.put("packageName", packageName);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("No se pudo abrir " + packageName + ": " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void launchUri(PluginCall call) {
        String url = call.getString("url", "");
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.trim().isEmpty()) {
            JSObject res = new JSObject();
            res.put("launched", false);
            call.resolve(res);
            return;
        }

        String cleanPkg = packageName.trim();
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();

            // Verificar que la app destino esté realmente instalada antes de intentar abrir
            try {
                pm.getPackageInfo(cleanPkg, 0);
            } catch (PackageManager.NameNotFoundException notFound) {
                JSObject res = new JSObject();
                res.put("launched", false);
                call.resolve(res);
                return;
            }

            // Intentar deep link únicamente dentro de la app destino (nunca abrir navegador ni redirigir a YouTube)
            String cleanUrl = url != null ? url.trim() : "";
            boolean isYouTubeUrl = cleanUrl.toLowerCase(Locale.ROOT).contains("youtube.com")
                || cleanUrl.toLowerCase(Locale.ROOT).contains("youtu.be");
            boolean isYouTubePkg = cleanPkg.toLowerCase(Locale.ROOT).contains("youtube")
                || cleanPkg.toLowerCase(Locale.ROOT).contains("smarttube");

            if (!cleanUrl.isEmpty() && (!isYouTubeUrl || isYouTubePkg)) {
                Intent deepIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl));
                deepIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                deepIntent.setPackage(cleanPkg);
                if (deepIntent.resolveActivity(pm) != null) {
                    context.startActivity(deepIntent);
                    JSObject res = new JSObject();
                    res.put("launched", true);
                    call.resolve(res);
                    return;
                }
            }

            // Lanzamiento directo a la app instalada
            Intent appIntent = pm.getLeanbackLaunchIntentForPackage(cleanPkg);
            if (appIntent == null) {
                appIntent = pm.getLaunchIntentForPackage(cleanPkg);
            }
            if (appIntent != null) {
                appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(appIntent);
                JSObject res = new JSObject();
                res.put("launched", true);
                call.resolve(res);
                return;
            }

            JSObject res = new JSObject();
            res.put("launched", false);
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("launched", false);
            call.resolve(res);
        }
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        String section = call.getString("section", "settings");
        Context context = getContext();

        try {
            Intent intent;
            if ("wifi".equals(section)) {
                intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
            } else if ("bluetooth".equals(section)) {
                intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            } else if ("display".equals(section)) {
                intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
            } else if ("sound".equals(section) || "image_sound".equals(section)) {
                intent = new Intent(Settings.ACTION_SOUND_SETTINGS);
                if (intent.resolveActivity(context.getPackageManager()) == null) {
                    intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
                }
            } else if ("inputs".equals(section)) {
                intent = new Intent("com.android.tv.action.VIEW_INPUTS");
                if (intent.resolveActivity(context.getPackageManager()) == null) {
                    intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
                }
            } else if ("account".equals(section)) {
                intent = new Intent(Settings.ACTION_SYNC_SETTINGS);
                if (intent.resolveActivity(context.getPackageManager()) == null) {
                    intent = new Intent(Settings.ACTION_SETTINGS);
                }
            } else if ("home".equals(section)) {
                intent = new Intent(Settings.ACTION_HOME_SETTINGS);
            } else if ("accessibility".equals(section)) {
                intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            } else if ("screensaver".equals(section)) {
                intent = new Intent(Settings.ACTION_DREAM_SETTINGS);
                if (intent.resolveActivity(context.getPackageManager()) == null) {
                    intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
                }
            } else if ("unknown_sources".equals(section) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + context.getPackageName())
                );
            } else {
                intent = new Intent(Settings.ACTION_SETTINGS);
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
            } catch (Exception ex) {
                call.reject("No se pudo abrir la configuración de Android TV", ex);
            }
        }
    }

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);
            long versionCode = PackageInfoCompat.getLongVersionCode(pInfo);

            JSObject res = new JSObject();
            res.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0.0");
            res.put("versionCode", versionCode);
            res.put("packageName", context.getPackageName());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("No se pudo obtener la versión de la app", e);
        }
    }

    @PluginMethod
    public void checkOtaUpdate(PluginCall call) {
        String repo = call.getString("repo");
        if (repo == null || repo.trim().isEmpty() || repo.contains("tu-usuario")) {
            call.reject("Configura tu repositorio de GitHub en los ajustes (ej: usuario/vora-tv-os)");
            return;
        }

        executor.execute(() -> {
            try {
                String cleanRepo = repo.trim().replaceAll("^https?://github\\.com/", "").replaceAll("/+$", "");
                String apiUrl = "https://api.github.com/repos/" + cleanRepo + "/releases/latest";

                HttpTextResponse releaseResp = fetchTextUrl(apiUrl, "application/vnd.github+json", 10000, 15000);
                if (releaseResp.statusCode == 404) {
                    call.reject("No se encontró ningún Release publicado en el repositorio " + cleanRepo);
                    return;
                }
                if (releaseResp.statusCode < 200 || releaseResp.statusCode >= 300) {
                    call.reject("Error al consultar GitHub Releases (HTTP " + releaseResp.statusCode + ")");
                    return;
                }

                JSONObject release = new JSONObject(releaseResp.body);
                String tagName = release.optString("tag_name", "1.0.0");
                String releaseNotes = release.optString("body", "");
                String publishedAt = release.optString("published_at", "");

                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = "";
                String versionJsonUrl = "";
                long fileSizeBytes = 0;

                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.getJSONObject(i);
                        String name = asset.optString("name", "").toLowerCase();
                        if (name.endsWith(".apk") && apkUrl.isEmpty()) {
                            apkUrl = asset.optString("browser_download_url", "");
                            fileSizeBytes = asset.optLong("size", 0);
                        } else if ("version.json".equals(name) && versionJsonUrl.isEmpty()) {
                            versionJsonUrl = asset.optString("browser_download_url", "");
                        }
                    }
                }

                if (apkUrl.isEmpty()) {
                    call.reject("El último release " + tagName + " no contiene un archivo APK compilado.");
                    return;
                }

                String cleanTag = tagName.replaceAll("(?i)^v", "").trim();
                long versionCode = 0;
                boolean mandatory = false;
                boolean fromVersionJson = false;

                // 1. Preferir version.json adjunto en el release (contiene versionCode y versionName exactos)
                if (!versionJsonUrl.isEmpty()) {
                    try {
                        HttpTextResponse vjResp = fetchTextUrl(versionJsonUrl, "application/json", 8000, 10000);
                        if (vjResp.statusCode >= 200 && vjResp.statusCode < 300) {
                            JSONObject vj = new JSONObject(vjResp.body);
                            long vjCode = vj.optLong("versionCode", 0);
                            String vjName = vj.optString("versionName", "").replaceAll("(?i)^v", "").trim();
                            String vjNotes = vj.optString("releaseNotes", "");
                            long vjSize = vj.optLong("fileSizeBytes", 0);
                            String vjPublished = vj.optString("publishedAt", "");
                            if (vjCode > 0) versionCode = vjCode;
                            if (!vjName.isEmpty()) cleanTag = vjName;
                            if (!vjNotes.isEmpty()) releaseNotes = vjNotes;
                            if (vjSize > 0) fileSizeBytes = vjSize;
                            if (!vjPublished.isEmpty()) publishedAt = vjPublished;
                            mandatory = vj.optBoolean("mandatory", false);
                            fromVersionJson = vjCode > 0;
                        }
                    } catch (Exception ignored) {
                        // Continuar con tag_name / body si version.json falla
                    }
                }

                // 2. Fallback: extraer Build / versionCode explícito del cuerpo si existe (nunca inventar 10012)
                if (versionCode <= 0) {
                    Pattern pattern = Pattern.compile("(?:versionCode[\":\\s]+(\\d+)|Build\\s+(\\d+))", Pattern.CASE_INSENSITIVE);
                    Matcher matcher = pattern.matcher(releaseNotes);
                    if (matcher.find()) {
                        String g1 = matcher.group(1);
                        String g2 = matcher.group(2);
                        String matchStr = g1 != null ? g1 : g2;
                        if (matchStr != null) {
                            versionCode = parseLongSafe(matchStr, 0);
                            fromVersionJson = versionCode > 0;
                        }
                    }
                }

                JSObject res = new JSObject();
                res.put("versionCode", versionCode);
                res.put("versionName", cleanTag);
                res.put("apkUrl", apkUrl);
                res.put("releaseNotes", releaseNotes);
                res.put("publishedAt", publishedAt);
                res.put("fileSizeBytes", fileSizeBytes);
                res.put("mandatory", mandatory);
                res.put("fromVersionJson", fromVersionJson);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("No se pudo conectar con GitHub: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void getRemoteConfig(PluginCall call) {
        String repo = call.getString("repo", "");
        String cleanRepo = repo == null
            ? ""
            : repo.trim().replaceAll("^https?://github\\.com/", "").replaceAll("/+$", "");

        if (cleanRepo.isEmpty() || !cleanRepo.contains("/") || cleanRepo.contains("tu-usuario")) {
            JSObject fallback = new JSObject();
            fallback.put("maintenanceMode", false);
            fallback.put("appsOnlyMode", false);
            call.resolve(fallback);
            return;
        }

        executor.execute(() -> {
            long ts = System.currentTimeMillis();
            String[] candidates = new String[] {
                "https://raw.githubusercontent.com/" + cleanRepo + "/main/public/launcher-status.json?t=" + ts,
                "https://raw.githubusercontent.com/" + cleanRepo + "/master/public/launcher-status.json?t=" + ts
            };

            for (String candidateUrl : candidates) {
                try {
                    HttpTextResponse resp = fetchTextUrl(candidateUrl, "application/json", 7000, 9000);
                    if (resp.statusCode >= 200 && resp.statusCode < 300) {
                        JSONObject json = new JSONObject(resp.body);
                        JSObject res = new JSObject();
                        res.put("maintenanceMode", json.optBoolean("maintenanceMode", false));
                        res.put("appsOnlyMode", json.optBoolean("appsOnlyMode", false));
                        res.put("title", json.optString("title", "Mantenimiento · Próxima actualización"));
                        res.put("message", json.optString("message", "El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS."));
                        res.put("updatedAt", json.optString("updatedAt", ""));
                        call.resolve(res);
                        return;
                    }
                } catch (Exception ignored) {
                    // Probar siguiente rama o fallback
                }
            }

            JSObject fallback = new JSObject();
            fallback.put("maintenanceMode", false);
            fallback.put("appsOnlyMode", false);
            call.resolve(fallback);
        });
    }

    @PluginMethod
    public void getRecommendationsFeed(PluginCall call) {
        String requestedUrl = call.getString("url", "");
        Context rawContext = getContext();
        String targetUrl = requestedUrl != null ? requestedUrl.trim() : "";

        if (targetUrl.isEmpty() && rawContext != null) {
            android.content.SharedPreferences prefs = rawContext
                .getApplicationContext()
                .getSharedPreferences("vora_launcher_prefs", Context.MODE_PRIVATE);
            String savedJson = prefs.getString("catalog_feed_json", "");
            if (savedJson != null && !savedJson.trim().isEmpty()) {
                JSObject res = new JSObject();
                res.put("ok", true);
                res.put("rawJson", savedJson.trim());
                res.put("source", "native-prefs");
                call.resolve(res);
                return;
            }
            String savedUrl = prefs.getString("catalog_feed_url", "");
            if (savedUrl != null) {
                targetUrl = savedUrl.trim();
            }
        }

        if (targetUrl.isEmpty() || !(targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
            JSObject empty = new JSObject();
            empty.put("ok", false);
            empty.put("rawJson", "");
            empty.put("source", "none");
            call.resolve(empty);
            return;
        }

        final String finalUrl = targetUrl;
        executor.execute(() -> {
            try {
                HttpTextResponse resp = fetchTextUrl(finalUrl, "application/json", 8000, 10000);
                if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.body != null && !resp.body.trim().isEmpty()) {
                    JSObject res = new JSObject();
                    res.put("ok", true);
                    res.put("rawJson", resp.body.trim());
                    res.put("source", "native-http");
                    call.resolve(res);
                    return;
                }
            } catch (Exception ignored) {
            }
            JSObject empty = new JSObject();
            empty.put("ok", false);
            empty.put("rawJson", "");
            empty.put("source", "none");
            call.resolve(empty);
        });
    }

    private static class HttpTextResponse {
        final int statusCode;
        final String body;
        HttpTextResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }
    }

    private HttpTextResponse fetchTextUrl(
        String urlStr,
        String acceptHeader,
        int connectTimeoutMs,
        int readTimeoutMs
    ) throws Exception {
        HttpURLConnection conn = null;
        try {
            String currentUrl = urlStr;
            int redirects = 0;
            while (redirects < 6) {
                URL url = new URL(currentUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setRequestMethod("GET");
                conn.setUseCaches(false);
                conn.setRequestProperty("User-Agent", "VORATVOS-Launcher-AndroidTV");
                conn.setRequestProperty("Cache-Control", "no-cache");
                if (acceptHeader != null) {
                    conn.setRequestProperty("Accept", acceptHeader);
                }
                conn.setConnectTimeout(connectTimeoutMs);
                conn.setReadTimeout(readTimeoutMs);

                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_MOVED_PERM
                    || code == HttpURLConnection.HTTP_MOVED_TEMP
                    || code == HttpURLConnection.HTTP_SEE_OTHER
                    || code == 307
                    || code == 308) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    if (location == null || location.isEmpty()) {
                        return new HttpTextResponse(code, "");
                    }
                    currentUrl = new URL(url, location).toString();
                    redirects++;
                } else {
                    break;
                }
            }

            if (conn == null) {
                return new HttpTextResponse(500, "");
            }

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                return new HttpTextResponse(code, "");
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            return new HttpTextResponse(code, sb.toString());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private long parseLongSafe(String str, long fallback) {
        try {
            return Long.parseLong(str.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("Falta URL del APK");
            return;
        }

        Context rawContext = getContext();
        if (rawContext == null) {
            call.reject("Contexto Android no disponible");
            return;
        }
        Context context = rawContext.getApplicationContext();
        PackageManager pm = context.getPackageManager();

        // Android 8.0+ requiere permiso explícito para instalar APKs desde el propio launcher
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !pm.canRequestPackageInstalls()) {
            emitOtaProgress(0, 0, 0, "permission_required",
                "Permiso requerido para instalar paquetes desde este launcher.");
            JSObject res = new JSObject();
            res.put("started", false);
            call.resolve(res);
            return;
        }

        JSObject startedRes = new JSObject();
        startedRes.put("started", true);
        call.resolve(startedRes);

        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                File otaDir = new File(context.getCacheDir(), "ota");
                if (!otaDir.exists() && !otaDir.mkdirs()) {
                    throw new IllegalStateException("No se pudo crear la carpeta temporal de descarga.");
                }
                File apkFile = new File(otaDir, "cgamestv-update.apk");
                if (apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }

                // Seguir redirecciones de GitHub Releases (incluyendo HTTP->HTTPS o distinto host CDN)
                String currentUrl = apkUrl;
                int redirects = 0;
                while (redirects < 8) {
                    URL url = new URL(currentUrl);
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "CgamesTVLauncher-OTA");
                    connection.connect();

                    int code = connection.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_PERM
                        || code == HttpURLConnection.HTTP_MOVED_TEMP
                        || code == HttpURLConnection.HTTP_SEE_OTHER
                        || code == 307
                        || code == 308) {
                        String location = connection.getHeaderField("Location");
                        connection.disconnect();
                        if (location == null || location.isEmpty()) {
                            throw new IllegalStateException("Redirección sin destino en GitHub Releases.");
                        }
                        currentUrl = new URL(url, location).toString();
                        redirects++;
                    } else {
                        break;
                    }
                }

                if (connection == null) {
                    throw new IllegalStateException("No se pudo establecer conexión HTTP.");
                }

                int statusCode = connection.getResponseCode();
                if (statusCode < 200 || statusCode >= 300) {
                    throw new IllegalStateException("Error HTTP " + statusCode + " al descargar el APK.");
                }

                long totalBytes = connection.getContentLengthLong();
                long downloadedBytes = 0;
                long lastEmitTime = 0;

                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream output = new FileOutputStream(apkFile)) {
                    byte[] buffer = new byte[16384];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                        downloadedBytes += count;

                        long now = System.currentTimeMillis();
                        if (now - lastEmitTime >= 160) {
                            int percent = totalBytes > 0
                                ? (int) Math.min(99, (downloadedBytes * 100L) / totalBytes)
                                : 0;
                            emitOtaProgress(percent, downloadedBytes, totalBytes, "downloading", null);
                            lastEmitTime = now;
                        }
                    }
                    output.flush();
                }

                emitOtaProgress(100, downloadedBytes, totalBytes > 0 ? totalBytes : downloadedBytes,
                    "installing", "Iniciando instalador de Android TV...");

                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                context.startActivity(installIntent);
            } catch (Exception e) {
                emitOtaProgress(0, 0, 0, "error",
                    "Error en actualización OTA: " + e.getMessage());
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private void emitOtaProgress(
        int percent,
        long downloadedBytes,
        long totalBytes,
        String status,
        String message
    ) {
        JSObject data = new JSObject();
        data.put("percent", percent);
        data.put("downloadedBytes", downloadedBytes);
        data.put("totalBytes", totalBytes);
        data.put("status", status);
        if (message != null) {
            data.put("message", message);
        }
        notifyListeners("otaDownloadProgress", data);
    }

    private static boolean isAllowedPreinstalledStreamingApp(String pkg) {
        if (pkg == null) return false;
        String lower = pkg.toLowerCase(Locale.ROOT);
        return lower.equals("com.google.android.youtube.tv")
            || lower.equals("com.google.android.youtube.tvmusic")
            || lower.equals("com.netflix.ninja")
            || lower.equals("com.amazon.amazonvideo.livingroom")
            || lower.equals("com.amazon.avod.thirdpartyclient")
            || lower.equals("com.disney.disneyplus")
            || lower.equals("com.wbd.stream")
            || lower.equals("com.hbo.hbonow")
            || lower.equals("com.hbomax")
            || lower.equals("com.spotify.tv.android")
            || lower.equals("com.apple.atve.androidtv.appletv")
            || lower.equals("com.mandoparty.tv");
    }

    private static boolean isHiddenSystemApp(ApplicationInfo appInfo, String pkg) {
        if (isAllowedPreinstalledStreamingApp(pkg)) {
            return false;
        }
        return appInfo != null && (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
    }

    private AppRecord buildAppRecord(PackageManager pm, ResolveInfo info, boolean isLeanback) {
        String pkg = info.activityInfo.packageName;
        CharSequence labelCs = info.loadLabel(pm);
        String name = labelCs != null ? labelCs.toString().trim() : pkg;

        ApplicationInfo appInfo = info.activityInfo.applicationInfo;
        boolean isSystem = isHiddenSystemApp(appInfo, pkg);

        String category = "other";
        if (appInfo != null) {
            boolean isGame = (appInfo.flags & ApplicationInfo.FLAG_IS_GAME) != 0
                || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && appInfo.category == ApplicationInfo.CATEGORY_GAME);
            if (isGame || "com.mandoparty.tv".equals(pkg)) {
                category = "games";
            } else if (isLeanback) {
                category = "tv";
            }
        } else if (isLeanback) {
            category = "tv";
        }

        String iconBase64 = ICON_CACHE.get(pkg);
        if (iconBase64 == null) {
            iconBase64 = "";
            try {
                Drawable drawable = info.loadIcon(pm);
                if (drawable == null && appInfo != null) {
                    drawable = pm.getApplicationIcon(appInfo);
                }
                if (drawable == null && isLeanback && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                    drawable = info.activityInfo.loadBanner(pm);
                    if (drawable == null && appInfo != null) {
                        drawable = pm.getApplicationBanner(appInfo);
                    }
                }
                if (drawable != null) {
                    iconBase64 = drawableToDataUri(drawable, 128);
                    if (!iconBase64.isEmpty()) {
                        ICON_CACHE.put(pkg, iconBase64);
                    }
                }
            } catch (Exception ignored) {
                iconBase64 = "";
            }
        }

        return new AppRecord(pkg, name, iconBase64, isLeanback, isSystem, category);
    }

    private String drawableToDataUri(Drawable drawable, int targetSizePx) {
        Bitmap bitmap = null;
        try {
            int rawW = drawable.getIntrinsicWidth();
            int rawH = drawable.getIntrinsicHeight();
            if ((rawW <= 0 || rawH <= 0) && drawable instanceof BitmapDrawable) {
                Bitmap src = ((BitmapDrawable) drawable).getBitmap();
                if (src != null) {
                    rawW = src.getWidth();
                    rawH = src.getHeight();
                }
            }

            int width = rawW > 0 ? rawW : targetSizePx;
            int height = rawH > 0 ? rawH : targetSizePx;
            float scale = Math.min((float) targetSizePx / width, (float) targetSizePx / height);
            int w = Math.max(1, Math.min(targetSizePx, Math.round(width * scale)));
            int h = Math.max(1, Math.min(targetSizePx, Math.round(height * scale)));

            bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);

            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream);
            byte[] bytes = stream.toByteArray();
            return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        } finally {
            if (bitmap != null && !bitmap.isRecycled()) {
                bitmap.recycle();
            }
        }
    }

    private static class AppRecord {
        final String packageName;
        final String name;
        final String iconDataUri;
        final boolean isLeanback;
        final boolean isSystemApp;
        final String category;

        AppRecord(
            String packageName,
            String name,
            String iconDataUri,
            boolean isLeanback,
            boolean isSystemApp,
            String category
        ) {
            this.packageName = packageName;
            this.name = name;
            this.iconDataUri = iconDataUri;
            this.isLeanback = isLeanback;
            this.isSystemApp = isSystemApp;
            this.category = category;
        }
    }

    @PluginMethod
    public void getSpotifyNowPlaying(PluginCall call) {
        Context rawContext = getContext();
        if (rawContext == null) {
            JSObject empty = new JSObject();
            empty.put("isPlaying", false);
            empty.put("track", "");
            empty.put("hasListenerPermission", false);
            empty.put("hasAccessibilityPermission", false);
            call.resolve(empty);
            return;
        }
        Context context = rawContext.getApplicationContext();
        bindMediaSessionListener();
        call.resolve(resolveSpotifyNowPlaying(context));
    }

    @PluginMethod
    public void getMusicServiceStatus(PluginCall call) {
        Context rawContext = getContext();
        JSObject res = new JSObject();
        if (rawContext == null) {
            res.put("hasNotificationAccess", false);
            res.put("hasAccessibilityAccess", false);
            res.put("isGoogleTv", false);
            call.resolve(res);
            return;
        }
        Context context = rawContext.getApplicationContext();
        res.put("hasNotificationAccess", hasNotificationListenerPermission(context));
        res.put("hasAccessibilityAccess", isAccessibilityServiceEnabled(context));
        res.put("isGoogleTv", isGoogleTvDevice(context));
        call.resolve(res);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Contexto Android no disponible");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
            } catch (Exception ex) {
                call.reject("No se pudo abrir ajustes de accesibilidad", ex);
            }
        }
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Contexto Android no disponible");
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            if (intent.resolveActivity(context.getPackageManager()) != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
                return;
            }
        } catch (Exception ignored) {
        }

        try {
            Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + context.getPackageName()));
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(fallback);
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception ex) {
            try {
                Intent settingsIntent = new Intent(Settings.ACTION_SETTINGS);
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(settingsIntent);
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
            } catch (Exception finalEx) {
                call.reject("No se pudo abrir ajustes de acceso multimedia", finalEx);
            }
        }
    }

    private boolean hasNotificationListenerPermission(Context context) {
        try {
            Set<String> enabled = NotificationManagerCompat.getEnabledListenerPackages(context);
            return enabled != null && enabled.contains(context.getPackageName());
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean isAccessibilityServiceEnabled(Context context) {
        if (VoraAccessibilityService.serviceConnected) {
            return true;
        }
        try {
            AccessibilityManager am = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
            if (am != null) {
                List<AccessibilityServiceInfo> enabled =
                    am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
                if (enabled != null) {
                    String selfPkg = context.getPackageName();
                    for (AccessibilityServiceInfo info : enabled) {
                        if (info.getId() != null && info.getId().contains(selfPkg)) {
                            return true;
                        }
                    }
                }
            }
            String flat = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            return flat != null && flat.contains(context.getPackageName());
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isGoogleTvDevice(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            pm.getPackageInfo("com.google.android.apps.tv.launcherx", 0);
            return true;
        } catch (Exception ignored) {
        }
        try {
            PackageManager pm = context.getPackageManager();
            pm.getPackageInfo("com.google.android.apps.tv.dreamx", 0);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void registerSpotifyReceivers() {
        Context rawContext = getContext();
        if (rawContext == null || spotifyBroadcastReceiver != null) return;
        Context context = rawContext.getApplicationContext();

        spotifyBroadcastReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                if (intent == null || intent.getAction() == null) return;
                String lowerAction = intent.getAction().toLowerCase(Locale.ROOT);
                String track = firstNonEmptyExtra(intent, "track", "trackName", "title", "android.media.metadata.TITLE");
                String artist = firstNonEmptyExtra(intent, "artist", "artistName", "android.media.metadata.ARTIST");
                String album = firstNonEmptyExtra(intent, "album", "albumName", "android.media.metadata.ALBUM");

                if (lowerAction.contains("metadata")) {
                    if (!track.isEmpty()) {
                        broadcastTrack = track;
                        broadcastArtist = artist;
                        broadcastAlbum = album;
                    }
                    if (intent.hasExtra("playing")) {
                        broadcastPlaying = intent.getBooleanExtra("playing", false);
                    } else if (!broadcastTrack.isEmpty()) {
                        broadcastPlaying = true;
                    }
                } else if (lowerAction.contains("play")) {
                    if (intent.hasExtra("playing")) {
                        broadcastPlaying = intent.getBooleanExtra("playing", false);
                    }
                    if (!track.isEmpty()) {
                        broadcastTrack = track;
                        if (!artist.isEmpty()) broadcastArtist = artist;
                        if (!album.isEmpty()) broadcastAlbum = album;
                    }
                }
                emitCurrentSpotifyState(ctx.getApplicationContext());
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction("com.spotify.music.metadatachanged");
        filter.addAction("com.spotify.music.playbackstatechanged");
        filter.addAction("com.spotify.music.queuechanged");
        filter.addAction("com.spotify.tv.android.metadatachanged");
        filter.addAction("com.spotify.tv.android.playbackstatechanged");
        filter.addAction("com.spotify.tv.android.queuechanged");
        filter.addAction("com.spotify.mobile.android.ui.widget.METADATA_CHANGED");
        filter.addAction("com.spotify.mobile.android.ui.widget.PLAYBACK_STATE_CHANGED");
        filter.addAction("com.android.music.metadatachanged");
        filter.addAction("com.android.music.playstatechanged");
        ContextCompat.registerReceiver(context, spotifyBroadcastReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
    }

    private String firstNonEmptyExtra(Intent intent, String... keys) {
        for (String key : keys) {
            String val = intent.getStringExtra(key);
            if (val != null && !val.trim().isEmpty()) {
                return val.trim();
            }
        }
        return "";
    }

    private void unregisterSpotifyReceivers() {
        Context rawContext = getContext();
        if (rawContext != null && spotifyBroadcastReceiver != null) {
            try {
                rawContext.getApplicationContext().unregisterReceiver(spotifyBroadcastReceiver);
            } catch (Exception ignored) {
            }
            spotifyBroadcastReceiver = null;
        }
    }

    private void bindMediaSessionListener() {
        Context rawContext = getContext();
        if (rawContext == null) return;
        Context context = rawContext.getApplicationContext();
        if (!hasNotificationListenerPermission(context)) return;

        try {
            if (mediaSessionManager == null) {
                mediaSessionManager = (MediaSessionManager) context.getSystemService(Context.MEDIA_SESSION_SERVICE);
            }
            if (mediaSessionManager == null) return;

            ComponentName listenerComp = new ComponentName(context, VoraMediaListenerService.class);
            if (activeSessionsListener == null) {
                activeSessionsListener = controllers -> {
                    attachSpotifyControllerCallback(controllers);
                    emitCurrentSpotifyState(context);
                };
                mediaSessionManager.addOnActiveSessionsChangedListener(
                    activeSessionsListener,
                    listenerComp,
                    new Handler(Looper.getMainLooper())
                );
            }

            List<MediaController> current = mediaSessionManager.getActiveSessions(listenerComp);
            attachSpotifyControllerCallback(current);
        } catch (Exception ignored) {
        }
    }

    private void unbindMediaSessionListener() {
        if (mediaSessionManager != null && activeSessionsListener != null) {
            try {
                mediaSessionManager.removeOnActiveSessionsChangedListener(activeSessionsListener);
            } catch (Exception ignored) {
            }
            activeSessionsListener = null;
        }
        if (activeSpotifyController != null && activeSpotifyCallback != null) {
            try {
                activeSpotifyController.unregisterCallback(activeSpotifyCallback);
            } catch (Exception ignored) {
            }
            activeSpotifyController = null;
            activeSpotifyCallback = null;
        }
    }

    private void attachSpotifyControllerCallback(List<MediaController> controllers) {
        if (activeSpotifyController != null && activeSpotifyCallback != null) {
            try {
                activeSpotifyController.unregisterCallback(activeSpotifyCallback);
            } catch (Exception ignored) {
            }
            activeSpotifyController = null;
            activeSpotifyCallback = null;
        }

        if (controllers == null) return;
        MediaController preferred = null;
        for (MediaController controller : controllers) {
            String pkg = controller.getPackageName();
            if (pkg == null) continue;
            String lower = pkg.toLowerCase(Locale.ROOT);
            if (lower.contains("spotify")) {
                preferred = controller;
                break;
            }
            if (preferred == null && lower.contains("mediashell")) {
                preferred = controller;
            }
        }

        if (preferred != null) {
            activeSpotifyController = preferred;
            activeSpotifyCallback = new MediaController.Callback() {
                @Override
                public void onPlaybackStateChanged(PlaybackState state) {
                    Context raw = getContext();
                    if (raw != null) emitCurrentSpotifyState(raw.getApplicationContext());
                }

                @Override
                public void onMetadataChanged(MediaMetadata metadata) {
                    Context raw = getContext();
                    if (raw != null) emitCurrentSpotifyState(raw.getApplicationContext());
                }
            };
            preferred.registerCallback(activeSpotifyCallback, new Handler(Looper.getMainLooper()));
        }
    }

    private void emitCurrentSpotifyState(Context context) {
        notifyListeners("spotifyPlaybackChanged", resolveSpotifyNowPlaying(context));
    }

    private static boolean isAudioCurrentlyPlaying(Context context) {
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return false;
            if (am.isMusicActive()) return true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                List<AudioPlaybackConfiguration> configs = am.getActivePlaybackConfigurations();
                if (configs != null) {
                    for (AudioPlaybackConfiguration cfg : configs) {
                        AudioAttributes attrs = cfg.getAudioAttributes();
                        if (attrs != null && attrs.getUsage() == AudioAttributes.USAGE_MEDIA) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private JSObject resolveSpotifyNowPlaying(Context context) {
        boolean hasPermission = hasNotificationListenerPermission(context);
        boolean hasAccessibility = isAccessibilityServiceEnabled(context);
        boolean musicAudioActive = isAudioCurrentlyPlaying(context);

        // 1. Consultar sesiones multimedia activas (priorizando Spotify y luego Cast / reproductores de música)
        try {
            MediaSessionManager msm = (MediaSessionManager) context.getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (msm != null) {
                ComponentName listenerComp = hasPermission
                    ? new ComponentName(context, VoraMediaListenerService.class)
                    : null;
                List<MediaController> controllers = msm.getActiveSessions(listenerComp);
                if (controllers != null) {
                    JSObject fallbackSession = null;
                    for (MediaController controller : controllers) {
                        String pkg = controller.getPackageName();
                        String lowerPkg = pkg != null ? pkg.toLowerCase(Locale.ROOT) : "";
                        boolean isSpotifyPkg = lowerPkg.contains("spotify");
                        boolean isCastOrMusicPkg = lowerPkg.contains("mediashell")
                            || lowerPkg.contains("music")
                            || lowerPkg.contains("tidal")
                            || lowerPkg.contains("deezer");

                        if (!isSpotifyPkg && !isCastOrMusicPkg) continue;

                        PlaybackState pbState = controller.getPlaybackState();
                        int state = pbState != null ? pbState.getState() : PlaybackState.STATE_NONE;
                        boolean playing = state == PlaybackState.STATE_PLAYING
                            || state == PlaybackState.STATE_BUFFERING
                            || state == PlaybackState.STATE_CONNECTING
                            || (pbState == null && musicAudioActive);
                        MediaMetadata meta = controller.getMetadata();

                        String track = "";
                        String artist = "";
                        String album = "";
                        String albumArt = "";

                        if (meta != null) {
                            CharSequence t = meta.getText(MediaMetadata.METADATA_KEY_TITLE);
                            if (t == null) t = meta.getText(MediaMetadata.METADATA_KEY_DISPLAY_TITLE);
                            CharSequence a = meta.getText(MediaMetadata.METADATA_KEY_ARTIST);
                            if (a == null) a = meta.getText(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                            CharSequence al = meta.getText(MediaMetadata.METADATA_KEY_ALBUM);

                            track = t != null ? t.toString().trim() : "";
                            artist = a != null ? a.toString().trim() : "";
                            album = al != null ? al.toString().trim() : "";

                            String artUri = meta.getString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI);
                            if (artUri != null && (artUri.startsWith("http://") || artUri.startsWith("https://"))) {
                                albumArt = artUri;
                            } else {
                                Bitmap bmp = meta.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
                                if (bmp == null) {
                                    bmp = meta.getBitmap(MediaMetadata.METADATA_KEY_ART);
                                }
                                if (bmp != null) {
                                    albumArt = bitmapToSmallJpegUri(bmp, 160);
                                }
                            }
                        }

                        if (!track.isEmpty()) {
                            JSObject res = new JSObject();
                            res.put("isPlaying", playing);
                            res.put("track", track);
                            res.put("artist", artist);
                            res.put("album", album);
                            res.put("albumArt", albumArt);
                            res.put("source", "android-session");
                            res.put("hasListenerPermission", hasPermission);
                            res.put("hasAccessibilityPermission", hasAccessibility);
                            if (isSpotifyPkg) {
                                return res;
                            } else if (playing && fallbackSession == null) {
                                fallbackSession = res;
                            }
                        }
                    }
                    if (fallbackSession != null) {
                        return fallbackSession;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        // 2. Fallback: notificación / MediaSession.Token capturada por VoraMediaListenerService
        if (VoraMediaListenerService.latestNotificationActive
            && !VoraMediaListenerService.latestNotificationTrack.isEmpty()
            && (VoraMediaListenerService.latestNotificationIsPlaying || musicAudioActive)) {
            JSObject notifRes = new JSObject();
            notifRes.put("isPlaying", true);
            notifRes.put("track", VoraMediaListenerService.latestNotificationTrack);
            notifRes.put("artist", VoraMediaListenerService.latestNotificationArtist);
            notifRes.put("album", VoraMediaListenerService.latestNotificationAlbum);
            notifRes.put("albumArt", "");
            notifRes.put("source", "android-session");
            notifRes.put("hasListenerPermission", hasPermission);
            notifRes.put("hasAccessibilityPermission", hasAccessibility);
            return notifRes;
        }

        // 3. Fallback Google TV: lectura vía Servicio de Accesibilidad VORA (no requiere Notification Access)
        if (!VoraAccessibilityService.latestSpotifyTrack.isEmpty()) {
            long ageMs = System.currentTimeMillis() - VoraAccessibilityService.latestSpotifyCapturedAt;
            if (musicAudioActive || ageMs < 8_000L) {
                JSObject accRes = new JSObject();
                accRes.put("isPlaying", true);
                accRes.put("track", VoraAccessibilityService.latestSpotifyTrack);
                accRes.put("artist", VoraAccessibilityService.latestSpotifyArtist);
                accRes.put("album", "");
                accRes.put("albumArt", "");
                accRes.put("source", "android-accessibility");
                accRes.put("hasListenerPermission", hasPermission);
                accRes.put("hasAccessibilityPermission", hasAccessibility);
                return accRes;
            }
        }

        // 4. Fallback: broadcasts directos de Spotify
        JSObject broadcastRes = new JSObject();
        broadcastRes.put("isPlaying", (broadcastPlaying || musicAudioActive) && !broadcastTrack.isEmpty());
        broadcastRes.put("track", broadcastTrack);
        broadcastRes.put("artist", broadcastArtist);
        broadcastRes.put("album", broadcastAlbum);
        broadcastRes.put("albumArt", "");
        broadcastRes.put("source", "android-broadcast");
        broadcastRes.put("hasListenerPermission", hasPermission);
        broadcastRes.put("hasAccessibilityPermission", hasAccessibility);
        return broadcastRes;
    }

    private String bitmapToSmallJpegUri(Bitmap src, int maxDim) {
        try {
            int w = src.getWidth();
            int h = src.getHeight();
            if (w <= 0 || h <= 0) return "";
            float scale = Math.min((float) maxDim / w, (float) maxDim / h);
            int targetW = Math.max(1, Math.round(w * Math.min(1f, scale)));
            int targetH = Math.max(1, Math.round(h * Math.min(1f, scale)));
            Bitmap scaled = Bitmap.createScaledBitmap(src, targetW, targetH, true);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            scaled.compress(Bitmap.CompressFormat.JPEG, 82, out);
            if (scaled != src && !scaled.isRecycled()) {
                scaled.recycle();
            }
            return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) {
            return "";
        }
    }

    @PluginMethod
    public void setKeepScreenOn(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        Activity activity = getActivity();
        if (activity == null) {
            JSObject res = new JSObject();
            res.put("ok", false);
            call.resolve(res);
            return;
        }
        activity.runOnUiThread(() -> {
            if (enabled) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setKeepScreenOn(true);
                }
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setKeepScreenOn(false);
                }
            }
            JSObject res = new JSObject();
            res.put("ok", true);
            call.resolve(res);
        });
    }

    public static String getLatestSpotifyTrackIfPlaying(Context context) {
        if (context == null) return "";
        try {
            boolean musicActive = isAudioCurrentlyPlaying(context);
            LauncherPlugin instance = activeInstanceRef != null ? activeInstanceRef.get() : null;
            if (instance != null) {
                JSObject obj = instance.resolveSpotifyNowPlaying(context.getApplicationContext());
                if (obj.optBoolean("isPlaying", false)) {
                    return obj.optString("track", "");
                }
            }
            if (VoraMediaListenerService.latestNotificationActive
                && (VoraMediaListenerService.latestNotificationIsPlaying || musicActive)) {
                return VoraMediaListenerService.latestNotificationTrack;
            }
            if (musicActive && !VoraAccessibilityService.latestSpotifyTrack.isEmpty()) {
                return VoraAccessibilityService.latestSpotifyTrack;
            }
        } catch (Exception ignored) {
        }
        return "";
    }
}
