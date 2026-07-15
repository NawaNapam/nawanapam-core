import type { CapacitorConfig } from "@capacitor/cli";

// Point the app at your local dev server instead of production, e.g.:
//   CAPACITOR_SERVER_URL=http://localhost:3000 npx cap sync android
// Requires `adb reverse tcp:3000 tcp:3000` (see `npm run adb:reverse`) so the
// device can reach your machine's dev server over the USB connection.
const devServerUrl = process.env.CAPACITOR_SERVER_URL;
// || "https://www.nawanapam.com"

const config: CapacitorConfig = {
  appId: "com.nawanapam.app",
  appName: "Nawa Napam",
  webDir: "www",
  server: {
    url: "https://www.nawanapam.com",
    cleartext: true,
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
    // Keep the native cold-start splash (android/.../res/drawable*/splash.png,
    // shown via the Theme.SplashScreen in styles.xml) on screen past the
    // Activity's first frame — otherwise it's replaced by a blank WebView
    // while Next.js loads/hydrates. `HomeGate` calls SplashScreen.hide()
    // once it knows whether to route to /login or /dashboard.
    SplashScreen: {
      launchAutoHide: false,
      showSpinner: false,
    },
  },
};

export default config;
