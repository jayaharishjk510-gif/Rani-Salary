
//measurementId: "G-GYMCBRPMP2"


import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCSokQBzS2snjctPMHqRQ6kVQ2OVjcig-c",
  authDomain: "rani-salary.firebaseapp.com",
  projectId: "rani-salary",
  storageBucket: "rani-salary.firebasestorage.app",
  messagingSenderId: "254708670079",
  appId: "1:254708670079:web:5b3078c51e98a5d20ea94a"
};

// 1. Initialize the Firebase App
const app = initializeApp(firebaseConfig);

// 2. Export the specific services so App.js can see them
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;