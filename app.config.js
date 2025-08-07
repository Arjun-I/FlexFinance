

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
      permissions: [],
      versionCode: 1,
      minSdkVersion: 21,
      targetSdkVersion: 33,
      compileSdkVersion: 33
    },
    web: {
      favicon: './assets/flexlogo.png',
      bundler: 'metro'
    },
    scheme: 'flexfinance',
    plugins: null,
    extra: {
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_YAHOO_FINANCE_ENABLED: process.env.EXPO_PUBLIC_YAHOO_FINANCE_ENABLED || 'true',
    }
  }
};
