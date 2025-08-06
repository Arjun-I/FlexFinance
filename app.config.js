

export default {
  expo: {
    name: 'FlexFinance',
    slug: 'flexfinance',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/flexlogo.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/flexlogo.png',
      resizeMode: 'contain',
      backgroundColor: '#0f172a'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.flexfinance.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/flexlogo.png',
        backgroundColor: '#0f172a'
      },
      package: 'com.flexfinance.app',
      permissions: []
    },
    web: {
      favicon: './assets/flexlogo.png',
      bundler: 'metro'
    },
    scheme: 'flexfinance',
    plugins: null,
    extra: {
      EXPO_PUBLIC_OPENAI_API_KEY: "sk-placeholder-key",
      EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyDXvcgkEF1476JRFlafgPxK1HaqBbX9lP8",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "flexfinance-20c90.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "flexfinance-20c90",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "flexfinance-20c90.firebasestorage.app",
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "517568675166",
      EXPO_PUBLIC_FIREBASE_APP_ID: "1:517568675166:android:0ece24a5eea74357df23cf",
      EXPO_PUBLIC_ALPHA_VANTAGE_KEY: "placeholder_key",
    }
  }
};
