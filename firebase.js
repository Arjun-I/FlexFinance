// Firebase configuration
// This is a basic setup for Firebase integration
// In a real app, you would use your actual Firebase project credentials

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For demo purposes, using placeholder values
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "flexfinance-demo.firebaseapp.com",
  projectId: "flexfinance-demo",
  storageBucket: "flexfinance-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.log('Firebase initialization error (using demo mode):', error.message);
  // For demo purposes, we'll continue without Firebase
  auth = null;
  db = null;
}

export { auth, db };
export default app;