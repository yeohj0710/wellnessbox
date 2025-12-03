const config = {
  appId: "com.wellnessbox.app",
  appName: "웰니스박스",
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
    contentInset: "automatic",
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
