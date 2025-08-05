import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;

const firebaseConfig = {
  apiKey: extra?.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: extra?.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
