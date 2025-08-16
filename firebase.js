import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config with fallback to environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "flexfinance-20c90.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "flexfinance-20c90",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "flexfinance-20c90.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "517568675166",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:517568675166:android:0ece24a5eea74357df23cf"
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Missing Firebase configuration fields:', missingFields);
  throw new Error(`Missing required Firebase config: ${missingFields.join(', ')}`);
}

console.log('🔧 Firebase config loaded:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId
});

// Initialize Firebase app with singleton pattern
let app, auth, db;

// Singleton pattern to prevent multiple initializations
const initializeFirebase = (() => {
  let initialized = false;
  
  return () => {
    if (initialized) {
      console.log('🔄 Firebase already initialized, returning existing instances');
      return { app, auth, db };
    }
    
    try {
      const existingApps = getApps();
      
      if (existingApps.length === 0) {
        console.log('🔥 First-time Firebase initialization...');
        app = initializeApp(firebaseConfig);
      } else {
        console.log('♻️ Using existing Firebase app');
        app = existingApps[0];
      }
      
      // Initialize auth with error handling
      try {
        if (!auth) {
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
          console.log('✅ Firebase Auth initialized with persistence');
        }
      } catch (authError) {
        if (authError.code === 'auth/already-initialized') {
          auth = getAuth(app);
          console.log('♻️ Using existing auth instance');
        } else {
          console.warn('⚠️ Persistence failed, using default auth:', authError.message);
          auth = getAuth(app);
        }
      }
      
      // Initialize Firestore
      if (!db) {
        db = getFirestore(app);
      }
      
      initialized = true;
      console.log('✅ Firebase initialization complete');
      return { app, auth, db };
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  };
})();

// Initialize Firebase
const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb } = initializeFirebase();
app = firebaseApp;
auth = firebaseAuth;
db = firebaseDb;

export { app, auth, db };