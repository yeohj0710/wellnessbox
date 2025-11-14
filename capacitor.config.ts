const config = {
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
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "dark",
      backgroundColor: "#ffffff",
    },
    SplashScreen: {
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
