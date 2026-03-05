
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services with the provided configuration.
 * Connects the Next.js frontend and backend logic to the Firebase Project.
 */
export function initializeFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Primary Databases
  const db = getFirestore(app);
  const rtdb = getDatabase(app);
  
  // Identity & Assets
  const auth = getAuth(app);
  const storage = getStorage(app);
  
  return { app, db, rtdb, auth, storage };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
