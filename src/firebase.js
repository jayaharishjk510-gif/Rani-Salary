import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// 1. Make sure these three Firestore methods are imported:
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Keep your existing configuration block exactly as it is:
const firebaseConfig = {
  apiKey: "AIzaSyCSokQBzS2snjctPMHqRQ6kVQ2OVjcig-c",
  authDomain: "rani-salary.firebaseapp.com",
  projectId: "rani-salary",
  storageBucket: "rani-salary.firebasestorage.app",
  messagingSenderId: "254708670079",
  appId: "1:254708670079:web:5b3078c51e98a5d20ea94a"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Initialize Firestore

// 2. Just paste this helper function at the very bottom:
export const getUserRole = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().role; // returns 'admin' or 'employee'
    }
    return 'employee'; // default fallback if no role is found
  } catch (error) {
    console.error("Error fetching user role:", error);
    return 'employee';
  }
};
