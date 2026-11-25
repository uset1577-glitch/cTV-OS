package com.cgamestv.launcher;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class VoraMediaListenerService extends NotificationListenerService {

    public static volatile String latestNotificationTrack = "";
    public static volatile String latestNotificationArtist = "";
    public static volatile boolean latestNotificationActive = false;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        syncActiveSpotifyNotification();
        LauncherPlugin.onMediaListenerChanged(getApplicationContext());
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn != null && sbn.getPackageName() != null && sbn.getPackageName().toLowerCase().contains("spotify")) {
            extractNotificationMetadata(sbn);
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn != null && sbn.getPackageName() != null && sbn.getPackageName().toLowerCase().contains("spotify")) {
            latestNotificationActive = false;
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    private void syncActiveSpotifyNotification() {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (sbn != null && sbn.getPackageName() != null && sbn.getPackageName().toLowerCase().contains("spotify")) {
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
            CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
            if (title != null && !title.toString().trim().isEmpty()) {
                latestNotificationTrack = title.toString().trim();
                latestNotificationArtist = text != null ? text.toString().trim() : "";
                latestNotificationActive = true;
            }
        } catch (Exception ignored) {
        }
    }
}
