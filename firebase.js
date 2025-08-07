import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: extra?.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: extra?.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const requiredFields = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missing = requiredFields.filter((field) => !firebaseConfig[field]);

let app;
let auth;
let db;

if (missing.length > 0) {
  const message = `Missing Firebase configuration fields: ${missing.join(', ')}`;
  console.error(message);
  throw new Error(`Firebase configuration incomplete: ${missing.join(', ')}`);
} else {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('✅ Firebase app initialized successfully');
    
    auth = getAuth(app);
    
    db = getFirestore(app);
    console.log('✅ Firebase services initialized successfully');
    
    // Android-specific Firebase setup
    if (Platform.OS === 'android') {
      console.log('📱 Android Firebase setup complete');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    if (Platform.OS === 'android') {
      console.error('📱 Android Firebase error:', error.message);
    }
    throw new Error('Firebase initialization failed');
  }
}

export { app, auth, db };
