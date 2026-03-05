
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Database } from 'firebase/database';

interface FirebaseContextType {
  app: FirebaseApp;
  db: Firestore;
  rtdb: Database;
  auth: Auth;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ 
  children, 
  app, 
  db, 
  rtdb,
  auth,
  storage
}: { 
  children: ReactNode; 
  app: FirebaseApp; 
  db: Firestore; 
  rtdb: Database;
  auth: Auth;
  storage: FirebaseStorage;
}) {
  return (
    <FirebaseContext.Provider value={{ app, db, rtdb, auth, storage }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within FirebaseProvider');
  return context;
};

export const useFirestore = () => useFirebase().db;
export const useAuth = () => useFirebase().auth;
export const useStorage = () => useFirebase().storage;
export const useRTDB = () => useFirebase().rtdb;
