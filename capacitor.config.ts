import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.niceworkloyalty.app',
  appName: 'nice work',
  webDir: 'public',
  server: {
    // TODO: Replace with your production URL (e.g., https://nice-work-loyalty.vercel.app)
    url: 'https://makenice.nicework.sg',
    // Ensure cookies and headers are handled correctly
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

export default config;
