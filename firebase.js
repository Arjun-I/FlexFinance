import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config with fallback to environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID 
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('Missing Firebase configuration fields:', missingFields);
  console.error('');
  console.error('🔧 SETUP INSTRUCTIONS:');
  console.error('1. Create a .env file in your project root');
  console.error('2. Add your Firebase configuration:');
  console.error('');
  console.error('EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key');
  console.error('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com');
  console.error('EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id');
  console.error('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com');
  console.error('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id');
  console.error('EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id');
  console.error('');
  console.error('3. Get these values from: Firebase Console > Project Settings > General > Your apps');
  console.error('4. Restart your development server after creating the .env file');
  console.error('');
  throw new Error(`Missing Firebase configuration. Please create a .env file with your Firebase credentials. Missing: ${missingFields.join(', ')}`);
}

// Initialize Firebase app (simplified singleton pattern)
let app, auth, db;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
  } else {
    app = getApp();
    console.log('Using existing Firebase app');
  }
} catch (error) {
  console.error('Firebase app initialization failed:', error);
  console.error('Firebase config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId
  });
  throw new Error('Failed to initialize Firebase app. Please check your configuration.');
}

// Initialize Auth with persistence
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('Firebase Auth initialized with persistence');
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
    console.log('Using existing auth instance');
  } else {
    console.warn('Auth persistence failed, using default auth:', error.message);
    try {
      auth = getAuth(app);
      console.log('Fallback auth initialization successful');
    } catch (fallbackError) {
      console.error('Both auth initialization methods failed:', fallbackError);
      throw new Error('Firebase Auth initialization failed completely.');
    }
  }
}

// Initialize Firestore
db = getFirestore(app);

// Note: In Firebase v9+, settings are configured differently
// Offline persistence is enabled by default
// Cache size and other settings are handled automatically

console.log('Firebase initialization complete');
console.log('Firebase config validation:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  hasStorageBucket: !!firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId
});

// Log configuration status for debugging (without exposing actual values)
console.log('Environment variables status:');
console.log('- EXPO_PUBLIC_FIREBASE_API_KEY:', firebaseConfig.apiKey ? '✓ Set' : '✗ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:', firebaseConfig.authDomain ? '✓ Set' : '✗ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? '✓ Set' : '✗ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:', firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_APP_ID:', firebaseConfig.appId ? '✓ Set' : '✗ Missing');

export { app, auth, db };