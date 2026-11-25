package com.cgamestv.launcher;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class VoraMediaListenerService extends NotificationListenerService {

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        LauncherPlugin.onMediaListenerChanged(getApplicationContext());
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn != null && sbn.getPackageName() != null && sbn.getPackageName().contains("spotify")) {
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn != null && sbn.getPackageName() != null && sbn.getPackageName().contains("spotify")) {
            LauncherPlugin.onMediaListenerChanged(getApplicationContext());
        }
    }
}
