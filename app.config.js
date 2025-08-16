

// Removed dotenv dependency - using hardcoded values for stability

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
        'ACCESS_NETWORK_STATE'
      ],
      versionCode: 1,
      minSdkVersion: 21,
      targetSdkVersion: 34,
      compileSdkVersion: 35,
      // Enhanced Android stability settings
      softwareKeyboardLayoutMode: 'pan',
      allowBackup: true,
      usesCleartextTraffic: true,
      // Simplified Android config for stability
      enableHermes: true
    },
    web: {
      favicon: './assets/flexlogo.png',
      bundler: 'metro'
    },
    scheme: 'flexfinance',
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: "35.0.0"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "1f7a1663-5908-4d6f-a3c1-03a0611900af"
      }
    },
    eas: {
      projectId: "1f7a1663-5908-4d6f-a3c1-03a0611900af"
    }
  }
};
