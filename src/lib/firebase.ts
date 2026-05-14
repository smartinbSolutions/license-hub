import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDybetaJZJIMTMIiUYAiHGMVIEbpbkKCKk",
  authDomain: "pos-license-manager.firebaseapp.com",
  projectId: "pos-license-manager",
  storageBucket: "pos-license-manager.firebasestorage.app",
  messagingSenderId: "1001017711852",
  appId: "1:1001017711852:web:1e51bde2ae88f1738e59c9",
  measurementId: "G-EQ3CDV36LC",
};

export const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp);

export const ACTIVATION_ENDPOINT = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/activateLicense`;
