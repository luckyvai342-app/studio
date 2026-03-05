
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Avoid excessive logging of empty context or "unknown" paths to reduce console noise
      if (error.context && error.context.path !== 'unknown') {
        console.error('Security Rule Violation:', {
          path: error.context.path,
          operation: error.context.operation,
          message: error.message
        });
        
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: `You do not have permission to ${error.context.operation} data. Please ensure you are logged in with the correct role.`,
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
