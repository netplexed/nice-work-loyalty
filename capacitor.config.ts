import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.niceworkloyalty.app',
  appName: 'nice work',
  webDir: 'public',
  server: {
    url: 'https://makenice.nicework.sg',
    allowNavigation: [
      'makenice.nicework.sg',
      '*.nicework.sg'
    ],
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    }
  }
};

// Tag the WebView user agent so the frontend JS can reliably detect
// that it's running inside the native Capacitor app shell.
// This is set via property assignment because the TS types don't include it yet.
(config.server as any).appendUserAgent = 'NiceWorkApp';

export default config;
