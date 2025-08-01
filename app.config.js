export default {
  expo: {
    name: "FlexFinance",
    slug: "flexfinance",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.flexfinance.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0f172a"
      },
      package: "com.flexfinance.app"
    },
    scheme: "flexfinance"
  }
}; 