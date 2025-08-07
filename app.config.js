

import 'dotenv/config';

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
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/flexlogo.png',
        backgroundColor: '#0f172a'
      },
      package: 'com.flexfinance.app',
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_EXTERNAL_STORAGE'
      ],
      versionCode: 1,
      minSdkVersion: 21,
      targetSdkVersion: 33,
      compileSdkVersion: 33,
      // Enhanced Android stability settings
      softwareKeyboardLayoutMode: 'pan',
      allowBackup: true,
      usesCleartextTraffic: true,
      // Additional crash prevention
      enableHermes: true,
      enableProguardInReleaseBuilds: false,
      enableSeparateBuildPerCPUArchitecture: false,
      // Memory optimization
      largeHeap: true,
      // Prevent crashes from native modules
      enableDangerousExperimentalLeanBuilds: false,
      // Additional debugging
      debuggable: true
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
      EXPO_PUBLIC_FINNHUB_API_KEY: process.env.EXPO_PUBLIC_FINNHUB_API_KEY,
      EXPO_PUBLIC_GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY,
      EXPO_PUBLIC_YAHOO_FINANCE_ENABLED: process.env.EXPO_PUBLIC_YAHOO_FINANCE_ENABLED || 'false',
      // New secure backend configuration
      EXPO_PUBLIC_PROXY_ENABLED: process.env.EXPO_PUBLIC_PROXY_ENABLED || 'false',
      EXPO_PUBLIC_PROXY_URL: process.env.EXPO_PUBLIC_PROXY_URL || 'https://your-proxy-server.com/api',
      EXPO_PUBLIC_SECURE_LLM_ENDPOINT: process.env.EXPO_PUBLIC_SECURE_LLM_ENDPOINT || 'https://your-secure-backend.com/api/llm',
      eas: {
        projectId: "1f7a1663-5908-4d6f-a3c1-03a0611900af"
      }
    }
  }
};
