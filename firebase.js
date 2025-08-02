import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDXvcgkEF1476JRFlafgPxK1HaqBbX9lP8",
  authDomain: "flexfinance-20c90.firebaseapp.com",
  projectId: "flexfinance-20c90",
  storageBucket: "flexfinance-20c90.firebasestorage.app",
  messagingSenderId: "517568675166",
  appId: "1:517568675166:android:0ece24a5eea74357df23cf"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});