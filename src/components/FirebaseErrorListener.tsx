'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Log for developer context (Next.js overlay will pick this up in dev)
      console.error('Security Rule Violation:', error.context);

      toast({
        variant: 'destructive',
        title: 'Security Access Denied',
        description: `Operation "${error.context.operation}" on ${error.context.path} was rejected. Please contact support if this persists.`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
