import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCAHFscsTjzIuEBB2-wu_7uikJMgL3XseM",
  authDomain: "quaint-booking-85jvd.firebaseapp.com",
  projectId: "quaint-booking-85jvd",
  storageBucket: "quaint-booking-85jvd.firebasestorage.app",
  messagingSenderId: "194663129279",
  appId: "1:194663129279:web:49c33384e53fe87df5e60a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID provided in the configuration
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
}, "ai-studio-ee1e84f9-8987-42e2-9fd9-d2628ab4943a");
export const auth = getAuth(app);

