package com.cgamestv.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean hasPausedOnce = false;
    private BroadcastReceiver screenOnReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LauncherPlugin.class);
        super.onCreate(savedInstanceState);

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
                    dispatchResumeEvent("screen_on");
                }
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_ON);
        ContextCompat.registerReceiver(this, screenOnReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public void onPause() {
        super.onPause();
        hasPausedOnce = true;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (hasPausedOnce) {
            hasPausedOnce = false;
            dispatchResumeEvent("app_resume");
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
