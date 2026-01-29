import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.niceworkloyalty.app',
  appName: 'Nice Work Loyalty',
  webDir: 'public',
  server: {
    // TODO: Replace with your production URL (e.g., https://nice-work-loyalty.vercel.app)
    url: 'https://nice-work-loyalty.vercel.app',
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
