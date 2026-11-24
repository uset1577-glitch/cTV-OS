import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cgamestv.launcher',
  appName: 'VORA TV OS',
  webDir: 'dist',
  android: {
    backgroundColor: '#080A0E',
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
