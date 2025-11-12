import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wellnessbox.app",
  appName: "WellnessBox",
  webDir: "dist",
  server: {
    url: "https://wellnessbox.me",
    cleartext: false,
    allowNavigation: ["wellnessbox.me", "static.cloudflareinsights.com"],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
