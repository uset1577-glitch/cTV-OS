package com.cgamestv.launcher;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;

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
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Launcher")
public class LauncherPlugin extends Plugin {

    private final ExecutorService executor = Executors.newCachedThreadPool();

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

                // 1. Consultar primero apps optimizadas para Android TV (LEANBACK_LAUNCHER)
                Intent leanbackIntent = new Intent(Intent.ACTION_MAIN);
                leanbackIntent.addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
                List<ResolveInfo> leanbackApps = pm.queryIntentActivities(leanbackIntent, 0);
                for (ResolveInfo info : leanbackApps) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(selfPackage)) continue;
                    appMap.putIfAbsent(pkg, buildAppRecord(pm, info, true));
                }

                // 2. Consultar apps estándar (LAUNCHER) para cubrir sideloads y utilidades
                Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
                launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> standardApps = pm.queryIntentActivities(launcherIntent, 0);
                for (ResolveInfo info : standardApps) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(selfPackage)) continue;
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
        String url = call.getString("url");
        String packageName = call.getString("packageName");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Falta url");
            return;
        }

        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();

            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (packageName != null && !packageName.trim().isEmpty()) {
                intent.setPackage(packageName);
            }

            if (intent.resolveActivity(pm) != null) {
                context.startActivity(intent);
                JSObject res = new JSObject();
                res.put("launched", true);
                call.resolve(res);
                return;
            }

            // Fallback: abrir la app directamente si el deep link específico no coincide
            if (packageName != null && !packageName.trim().isEmpty()) {
                Intent appIntent = pm.getLeanbackLaunchIntentForPackage(packageName);
                if (appIntent == null) {
                    appIntent = pm.getLaunchIntentForPackage(packageName);
                }
                if (appIntent != null) {
                    appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(appIntent);
                    JSObject res = new JSObject();
                    res.put("launched", true);
                    call.resolve(res);
                    return;
                }

                // Si no está instalada, intentar abrir en Google Play Store de Android TV
                Intent playIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + packageName)
                );
                playIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (playIntent.resolveActivity(pm) != null) {
                    context.startActivity(playIntent);
                    JSObject res = new JSObject();
                    res.put("launched", true);
                    res.put("openedStore", true);
                    call.resolve(res);
                    return;
                }
            }

            JSObject res = new JSObject();
            res.put("launched", false);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("No se pudo abrir sugerencia: " + e.getMessage(), e);
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
            } else if ("home".equals(section)) {
                intent = new Intent(Settings.ACTION_HOME_SETTINGS);
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
            call.reject("Configura tu repositorio de GitHub en los ajustes (ej: usuario/cTV-OS)");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String cleanRepo = repo.trim().replaceAll("^https?://github\\.com/", "").replaceAll("/+$", "");
                String apiUrl = "https://api.github.com/repos/" + cleanRepo + "/releases/latest";

                URL url = new URL(apiUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "CTVOS-Launcher-AndroidTV");
                conn.setRequestProperty("Accept", "application/vnd.github+json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                if (code == 404) {
                    call.reject("No se encontró ningún Release publicado en el repositorio " + cleanRepo);
                    return;
                }
                if (code < 200 || code >= 300) {
                    call.reject("Error al consultar GitHub Releases (HTTP " + code + ")");
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONObject release = new JSONObject(sb.toString());
                String tagName = release.optString("tag_name", "1.0.0");
                String releaseNotes = release.optString("body", "");
                String publishedAt = release.optString("published_at", "");

                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = "";
                long fileSizeBytes = 0;

                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.getJSONObject(i);
                        String name = asset.optString("name", "");
                        if (name.toLowerCase().endsWith(".apk")) {
                            apkUrl = asset.optString("browser_download_url", "");
                            fileSizeBytes = asset.optLong("size", 0);
                            break;
                        }
                    }
                }

                if (apkUrl.isEmpty()) {
                    call.reject("El último release " + tagName + " no contiene un archivo APK compilado.");
                    return;
                }

                String cleanTag = tagName.replaceAll("(?i)^v", "");
                String[] parts = cleanTag.split("\\.");
                long p0 = parts.length > 0 ? parseLongSafe(parts[0], 1) : 1;
                long p1 = parts.length > 1 ? parseLongSafe(parts[1], 0) : 0;
                long p2 = parts.length > 2 ? parseLongSafe(parts[2], 0) : 0;
                long versionCode = p0 * 10000 + p1 * 100 + p2;

                Pattern pattern = Pattern.compile("(?:versionCode[\":\\s]+(\\d+)|Build\\s+(\\d+))", Pattern.CASE_INSENSITIVE);
                Matcher matcher = pattern.matcher(releaseNotes);
                if (matcher.find()) {
                    String g1 = matcher.group(1);
                    String g2 = matcher.group(2);
                    String matchStr = g1 != null ? g1 : g2;
                    if (matchStr != null) {
                        versionCode = parseLongSafe(matchStr, versionCode);
                    }
                }

                JSObject res = new JSObject();
                res.put("versionCode", versionCode);
                res.put("versionName", cleanTag);
                res.put("apkUrl", apkUrl);
                res.put("releaseNotes", releaseNotes);
                res.put("publishedAt", publishedAt);
                res.put("fileSizeBytes", fileSizeBytes);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("No se pudo conectar con GitHub: " + e.getMessage(), e);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
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

    private AppRecord buildAppRecord(PackageManager pm, ResolveInfo info, boolean isLeanback) {
        String pkg = info.activityInfo.packageName;
        CharSequence labelCs = info.loadLabel(pm);
        String name = labelCs != null ? labelCs.toString().trim() : pkg;

        ApplicationInfo appInfo = info.activityInfo.applicationInfo;
        boolean isSystem = appInfo != null && (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;

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

        String iconBase64 = "";
        try {
            Drawable drawable = null;
            if (isLeanback && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                drawable = info.activityInfo.loadBanner(pm);
                if (drawable == null && appInfo != null) {
                    drawable = pm.getApplicationBanner(appInfo);
                }
            }
            if (drawable == null) {
                drawable = info.loadIcon(pm);
            }
            if (drawable != null) {
                iconBase64 = drawableToDataUri(drawable, 112);
            }
        } catch (Exception ignored) {
            iconBase64 = "";
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
}
