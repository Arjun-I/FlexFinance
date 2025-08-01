// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDXvcgkEF1476JRFlafgPxK1HaqBbX9lP8",
  authDomain: "flexfinance-20c90.firebaseapp.com",
  projectId: "flexfinance-20c90",
  storageBucket: "flexfinance-20c90.firebasestorage.app",
  messagingSenderId: "517568675166",
  appId: "1:517568675166:android:0ece24a5eea74357df23cf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
