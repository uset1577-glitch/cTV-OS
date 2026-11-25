package com.cgamestv.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String EXTRA_LAUNCH_SCREENSAVER = "vora_launch_screensaver";

    private boolean hasPausedOnce = false;
    private boolean pendingLaunchScreensaver = false;
    private BroadcastReceiver screenOnReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LauncherPlugin.class);
        super.onCreate(savedInstanceState);

        applyKeepScreenOn();
        handleScreensaverIntent(getIntent());

        // En un Launcher real, el botón Atrás navega dentro de la interfaz TV y nunca cierra el Home
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'BrowserBack', code: 'BrowserBack', keyCode: 4, bubbles: true, cancelable: true }));",
                        null
                    );
                }
            }
        });

        // Detectar encendido de pantalla de la TV para refrescar recomendaciones automáticamente
        screenOnReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                    applyKeepScreenOn();
                    dispatchResumeEvent("screen_on");
                }
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_ON);
        ContextCompat.registerReceiver(this, screenOnReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyKeepScreenOn();
        handleScreensaverIntent(intent);
    }

    @Override
    public void onPause() {
        super.onPause();
        hasPausedOnce = true;
    }

    @Override
    public void onResume() {
        super.onResume();
        applyKeepScreenOn();
        if (hasPausedOnce) {
            hasPausedOnce = false;
            dispatchResumeEvent("app_resume");
        }
        if (pendingLaunchScreensaver) {
            pendingLaunchScreensaver = false;
            dispatchLaunchScreensaver();
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyKeepScreenOn();
        }
    }

    @Override
    public void onDestroy() {
        if (screenOnReceiver != null) {
            try {
                unregisterReceiver(screenOnReceiver);
            } catch (Exception ignored) {
            }
            screenOnReceiver = null;
        }
        super.onDestroy();
    }

    private void applyKeepScreenOn() {
        try {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setKeepScreenOn(true);
            }
        } catch (Exception ignored) {
        }
    }

    private void handleScreensaverIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra(EXTRA_LAUNCH_SCREENSAVER, false)) {
            intent.removeExtra(EXTRA_LAUNCH_SCREENSAVER);
            pendingLaunchScreensaver = true;
            dispatchLaunchScreensaver();
        }
    }

    private void dispatchLaunchScreensaver() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('voraLaunchScreensaver'));",
                    null
                )
            );
        }
    }

    private void dispatchResumeEvent(String reason) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('voraTvResume', { detail: { reason: '" + reason + "' } }));",
                    null
                )
            );
        }
    }
}
