package com.cgamestv.launcher;

import android.accessibilityservice.AccessibilityService;
import android.app.Notification;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Bundle;
import android.os.Parcelable;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class VoraAccessibilityService extends AccessibilityService {

    public static volatile boolean serviceConnected = false;
    public static volatile String latestSpotifyTrack = "";
    public static volatile String latestSpotifyArtist = "";
    public static volatile long latestSpotifyCapturedAt = 0L;

    private static volatile long lastDreamInterceptAt = 0L;

    private static final Set<String> SCREENSAVER_PACKAGES = new HashSet<>(Arrays.asList(
        "com.google.android.apps.tv.dreamx",
        "com.google.android.backdrop",
        "com.android.dreams.basic",
        "com.android.dreams.phototable"
    ));

    private static final Set<String> IGNORED_UI_LABELS = new HashSet<>(Arrays.asList(
        "spotify", "inicio", "home", "buscar", "search", "tu biblioteca", "your library",
        "biblioteca", "library", "reproducir", "play", "pausa", "pause", "pausar",
        "siguiente", "next", "anterior", "previous", "aleatorio", "shuffle",
        "repetir", "repeat", "conectar", "connect", "dispositivos", "devices",
        "letras", "lyrics", "cola", "queue", "configuración", "configuracion",
        "settings", "ajustes", "premium", "podcast", "podcasts", "álbum", "album",
        "artista", "artist", "canciones", "songs", "playlists", "listas",
        "añadir a favoritos", "me gusta", "liked songs", "descargar", "compartir"
    ));

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        serviceConnected = true;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        serviceConnected = false;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        serviceConnected = false;
        super.onDestroy();
    }

    @Override
    public void onInterrupt() {
        // Requerido por AccessibilityService
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        CharSequence pkgCs = event.getPackageName();
        if (pkgCs == null) return;

        String pkg = pkgCs.toString().toLowerCase(Locale.ROOT);
        int eventType = event.getEventType();

        // 1. Interceptar el salvapantallas nativo de Google TV / Backdrop y reemplazarlo por VORA TV OS
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && SCREENSAVER_PACKAGES.contains(pkg)) {
            long now = System.currentTimeMillis();
            if (now - lastDreamInterceptAt > 3000L) {
                lastDreamInterceptAt = now;
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                launchIntent.putExtra(MainActivity.EXTRA_LAUNCH_SCREENSAVER, true);
                try {
                    startActivity(launchIntent);
                } catch (Exception ignored) {
                }
            }
            return;
        }

        // 2. Detectar reproducción en Spotify / Google Cast sin depender de permisos ocultos
        if (pkg.contains("spotify") || pkg.contains("mediashell")) {
            if (eventType == AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED) {
                extractFromNotificationEvent(event);
            }
            if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                || eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                extractFromActiveWindow(pkg);
            }
        }
    }

    private void extractFromNotificationEvent(AccessibilityEvent event) {
        try {
            Parcelable data = event.getParcelableData();
            if (data instanceof Notification) {
                Notification notification = (Notification) data;
                Bundle extras = notification.extras;
                if (extras != null) {
                    // Intentar leer MediaSession.Token embebido en la notificación
                    MediaSession.Token token = extras.getParcelable(Notification.EXTRA_MEDIA_SESSION);
                    if (token != null) {
                        MediaController controller = new MediaController(getApplicationContext(), token);
                        MediaMetadata meta = controller.getMetadata();
                        PlaybackState pb = controller.getPlaybackState();
                        boolean isPaused = pb != null && (
                            pb.getState() == PlaybackState.STATE_PAUSED
                                || pb.getState() == PlaybackState.STATE_STOPPED
                        );
                        if (meta != null && !isPaused) {
                            CharSequence t = meta.getText(MediaMetadata.METADATA_KEY_TITLE);
                            if (t == null) t = meta.getText(MediaMetadata.METADATA_KEY_DISPLAY_TITLE);
                            CharSequence a = meta.getText(MediaMetadata.METADATA_KEY_ARTIST);
                            if (a == null) a = meta.getText(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                            if (t != null && !t.toString().trim().isEmpty()) {
                                updateCapturedTrack(t.toString().trim(), a != null ? a.toString().trim() : "");
                                return;
                            }
                        }
                    }

                    CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
                    CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
                    if (title != null && isValidTrackCandidate(title.toString())) {
                        updateCapturedTrack(
                            title.toString().trim(),
                            text != null && isValidTrackCandidate(text.toString()) ? text.toString().trim() : ""
                        );
                        return;
                    }
                }
            }

            List<CharSequence> eventTexts = event.getText();
            if (eventTexts != null && !eventTexts.isEmpty()) {
                List<String> valid = new ArrayList<>();
                for (CharSequence cs : eventTexts) {
                    if (cs != null && isValidTrackCandidate(cs.toString())) {
                        valid.add(cs.toString().trim());
                    }
                }
                if (!valid.isEmpty()) {
                    String first = valid.get(0);
                    String second = valid.size() > 1 ? valid.get(1) : "";
                    if (second.isEmpty() && first.contains(" - ")) {
                        String[] parts = first.split(" - ", 2);
                        updateCapturedTrack(parts[0].trim(), parts[1].trim());
                    } else {
                        updateCapturedTrack(first, second);
                    }
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void extractFromActiveWindow(String pkg) {
        AccessibilityNodeInfo root = null;
        try {
            root = getRootInActiveWindow();
            if (root == null) return;

            String foundTrackById = "";
            String foundArtistById = "";
            List<String> candidateTexts = new ArrayList<>();

            ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
            queue.add(root);
            int visited = 0;

            while (!queue.isEmpty() && visited < 110) {
                AccessibilityNodeInfo node = queue.poll();
                if (node == null) continue;
                visited++;

                CharSequence textCs = node.getText();
                if (textCs != null) {
                    String text = textCs.toString().trim();
                    if (isValidTrackCandidate(text)) {
                        String viewId = node.getViewIdResourceName();
                        String lowerId = viewId != null ? viewId.toLowerCase(Locale.ROOT) : "";

                        if (!lowerId.isEmpty()) {
                            if (foundTrackById.isEmpty() && (
                                lowerId.contains("track_title")
                                    || lowerId.contains("song_title")
                                    || lowerId.contains("track_name")
                                    || lowerId.contains("now_playing_title")
                                    || lowerId.contains("metadata_title")
                                    || lowerId.endsWith(":id/title")
                            )) {
                                foundTrackById = text;
                            } else if (foundArtistById.isEmpty() && (
                                lowerId.contains("artist")
                                    || lowerId.contains("subtitle")
                                    || lowerId.contains("metadata_subtitle")
                                    || lowerId.contains("track_subtitle")
                            )) {
                                foundArtistById = text;
                            }
                        }

                        if (!candidateTexts.contains(text)) {
                            candidateTexts.add(text);
                        }
                    }
                }

                int childCount = Math.min(node.getChildCount(), 20);
                for (int i = 0; i < childCount; i++) {
                    AccessibilityNodeInfo child = node.getChild(i);
                    if (child != null) {
                        queue.add(child);
                    }
                }
            }

            if (!foundTrackById.isEmpty()) {
                updateCapturedTrack(foundTrackById, foundArtistById);
                return;
            }

            // En Spotify TV (Compose / IDs ofuscados), la barra inferior o reproductor suele mostrar Título y Artista
            if (pkg.contains("spotify") && candidateTexts.size() >= 2) {
                // Buscar patrón "Canción" seguido de "Artista" evitando títulos largos de secciones
                for (int i = 0; i < candidateTexts.size() - 1; i++) {
                    String a = candidateTexts.get(i);
                    String b = candidateTexts.get(i + 1);
                    if (a.length() <= 70 && b.length() <= 60 && !a.equalsIgnoreCase(b)) {
                        if (a.contains(" · ")) {
                            String[] parts = a.split(" · ", 2);
                            updateCapturedTrack(parts[0].trim(), parts[1].trim());
                            return;
                        }
                    }
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void updateCapturedTrack(String track, String artist) {
        if (track == null || track.trim().isEmpty()) return;
        String cleanTrack = track.trim();
        String cleanArtist = artist != null ? artist.trim() : "";
        boolean changed = !cleanTrack.equals(latestSpotifyTrack) || !cleanArtist.equals(latestSpotifyArtist);
        latestSpotifyTrack = cleanTrack;
        latestSpotifyArtist = cleanArtist;
        latestSpotifyCapturedAt = System.currentTimeMillis();
        if (changed) {
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    private boolean isValidTrackCandidate(String raw) {
        if (raw == null) return false;
        String s = raw.trim();
        if (s.length() < 2 || s.length() > 110) return false;
        String lower = s.toLowerCase(Locale.ROOT);
        if (IGNORED_UI_LABELS.contains(lower)) return false;
        // Ignorar contadores de tiempo tipo 01:23 o -2:45
        if (s.matches("^-?\\d{1,2}:\\d{2}(:\\d{2})?$")) return false;
        // Ignorar solo números o símbolos
        if (s.matches("^[\\d\\s.,:/\\-]+$")) return false;
        return true;
    }
}
