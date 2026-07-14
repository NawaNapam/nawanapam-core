import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nawanapam.app",
  appName: "NawaNapam",
  webDir: "www",
  server: {
    url: "https://www.nawanapam.com",
    cleartext: false,
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
  },
};

export default config;
