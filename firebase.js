import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;

// Use the actual Firebase config from your google-services-2.json
const firebaseConfig = {
  apiKey: "AIzaSyDXvcgkEF1476JRFlafgPxK1HaqBbX9lP8",
  authDomain: "flexfinance-20c90.firebaseapp.com",
  projectId: "flexfinance-20c90",
  storageBucket: "flexfinance-20c90.appspot.com",
  messagingSenderId: "517568675166",
  appId: "1:517568675166:android:0ece24a5eea74357df23cf"
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
