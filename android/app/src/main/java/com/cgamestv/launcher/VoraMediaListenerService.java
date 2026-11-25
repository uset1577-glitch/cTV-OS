package com.cgamestv.launcher;

import android.app.Notification;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.Locale;

public class VoraMediaListenerService extends NotificationListenerService {

    public static volatile String latestNotificationTrack = "";
    public static volatile String latestNotificationArtist = "";
    public static volatile String latestNotificationAlbum = "";
    public static volatile boolean latestNotificationActive = false;
    public static volatile boolean latestNotificationIsPlaying = false;
    public static volatile String latestNotificationPackage = "";
    public static volatile long latestNotificationUpdatedAt = 0L;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        syncActiveMediaNotification();
        LauncherPlugin.onMediaListenerChanged(getApplicationContext());
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (isSupportedMusicNotification(sbn)) {
            extractNotificationMetadata(sbn);
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn != null && sbn.getPackageName() != null
            && sbn.getPackageName().equalsIgnoreCase(latestNotificationPackage)) {
            latestNotificationActive = false;
            latestNotificationIsPlaying = false;
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    private boolean isSupportedMusicNotification(StatusBarNotification sbn) {
        if (sbn == null || sbn.getPackageName() == null) return false;
        String pkg = sbn.getPackageName().toLowerCase(Locale.ROOT);
        if (pkg.contains("spotify") || pkg.contains("mediashell")) {
            return true;
        }
        Notification n = sbn.getNotification();
        if (n == null) return false;
        if (Notification.CATEGORY_TRANSPORT.equals(n.category)) return true;
        return n.extras != null && n.extras.getParcelable(Notification.EXTRA_MEDIA_SESSION) != null;
    }

    private void syncActiveMediaNotification() {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            // Priorizar Spotify primero
            for (StatusBarNotification sbn : active) {
                if (sbn != null && sbn.getPackageName() != null
                    && sbn.getPackageName().toLowerCase(Locale.ROOT).contains("spotify")) {
                    extractNotificationMetadata(sbn);
                    return;
                }
            }
            for (StatusBarNotification sbn : active) {
                if (isSupportedMusicNotification(sbn)) {
                    extractNotificationMetadata(sbn);
                    return;
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void extractNotificationMetadata(StatusBarNotification sbn) {
        try {
            Notification notification = sbn.getNotification();
            if (notification == null || notification.extras == null) return;
            Bundle extras = notification.extras;
            String pkg = sbn.getPackageName() != null ? sbn.getPackageName() : "";

            // 1. Leer directamente desde MediaSession.Token si viene adjunto (más preciso y con estado real)
            MediaSession.Token token = extras.getParcelable(Notification.EXTRA_MEDIA_SESSION);
            if (token != null) {
                MediaController controller = new MediaController(getApplicationContext(), token);
                PlaybackState pb = controller.getPlaybackState();
                MediaMetadata meta = controller.getMetadata();

                boolean playing = pb == null
                    || pb.getState() == PlaybackState.STATE_PLAYING
                    || pb.getState() == PlaybackState.STATE_BUFFERING
                    || pb.getState() == PlaybackState.STATE_CONNECTING;

                if (meta != null) {
                    CharSequence t = meta.getText(MediaMetadata.METADATA_KEY_TITLE);
                    if (t == null) t = meta.getText(MediaMetadata.METADATA_KEY_DISPLAY_TITLE);
                    CharSequence a = meta.getText(MediaMetadata.METADATA_KEY_ARTIST);
                    if (a == null) a = meta.getText(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                    CharSequence al = meta.getText(MediaMetadata.METADATA_KEY_ALBUM);

                    String track = t != null ? t.toString().trim() : "";
                    if (!track.isEmpty()) {
                        latestNotificationTrack = track;
                        latestNotificationArtist = a != null ? a.toString().trim() : "";
                        latestNotificationAlbum = al != null ? al.toString().trim() : "";
                        latestNotificationPackage = pkg;
                        latestNotificationActive = true;
                        latestNotificationIsPlaying = playing;
                        latestNotificationUpdatedAt = System.currentTimeMillis();
                        return;
                    }
                }
            }

            // 2. Fallback a EXTRA_TITLE / EXTRA_TEXT
            CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
            if (title != null && !title.toString().trim().isEmpty()) {
                latestNotificationTrack = title.toString().trim();
                latestNotificationArtist = text != null ? text.toString().trim() : "";
                latestNotificationAlbum = "";
                latestNotificationPackage = pkg;
                latestNotificationActive = true;
                latestNotificationIsPlaying = true;
                latestNotificationUpdatedAt = System.currentTimeMillis();
            }
        } catch (Exception ignored) {
        }
    }
}
