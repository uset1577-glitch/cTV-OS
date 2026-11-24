package com.cgamestv.launcher;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
    }
}
