// Firebase bootstrap. When the EXPO_PUBLIC_FIREBASE_* variables are missing the app runs in
// offline mode: local accounts in AsyncStorage and bot-only matches.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import type { Database } from 'firebase/database';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST (e.g. 127.0.0.1) to run against the local Firebase
// emulators (`firebase emulators:start`) instead of a real project. Useful for testing multiplayer.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId && config.databaseURL);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

function init() {
  if (!isFirebaseConfigured || app) return;
  app = getApps().length ? getApp() : initializeApp(config);
  if (Platform.OS === 'web') {
    auth = FirebaseAuth.getAuth(app);
  } else {
    // getReactNativePersistence ships in the React Native build of firebase/auth but is not in
    // the default type declarations, so reach it dynamically.
    const getRNPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: unknown) => FirebaseAuth.Persistence })
      .getReactNativePersistence;
    try {
      auth = FirebaseAuth.initializeAuth(app, getRNPersistence ? { persistence: getRNPersistence(AsyncStorage) } : {});
    } catch {
      auth = FirebaseAuth.getAuth(app);
    }
  }
  db = getFirestore(app);
  rtdb = getDatabase(app);
  if (emulatorHost) {
    FirebaseAuth.connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectDatabaseEmulator(rtdb, emulatorHost, 9000);
  }
}

init();

export function firebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase is not configured');
  return auth;
}

export function firestore(): Firestore {
  if (!db) throw new Error('Firebase is not configured');
  return db;
}

export function realtimeDb(): Database {
  if (!rtdb) throw new Error('Firebase is not configured');
  return rtdb;
}
