import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config loaded from environment variables with fallback credentials
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCSokQBzS2snjctPMHqRQ6kVQ2OVjcig-c",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "rani-salary.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "rani-salary",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "rani-salary.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "254708670079",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:254708670079:web:5b3078c51e98a5d20ea94a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
