import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readConfig(): FirebaseConfig | null {
  // Configure via Vite env vars. For Capacitor Android builds, these are still injected at build time.
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.storageBucket || !cfg.messagingSenderId || !cfg.appId) {
    return null;
  }
  return cfg as FirebaseConfig;
}

export function isFirebaseConfigured() {
  return Boolean(readConfig());
}

export function getFirebaseApp(): FirebaseApp | null {
  const cfg = readConfig();
  if (!cfg) return null;
  const existing = getApps()[0];
  return existing ?? initializeApp(cfg);
}

export function getFirebaseServices() {
  const app = getFirebaseApp();
  if (!app) return null;
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

