
'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth, storage } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider app={app} db={db} auth={auth} storage={storage}>
      {children}
    </FirebaseProvider>
  );
}
