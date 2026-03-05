
"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('ff_user');
      const isLoginPage = pathname === '/login';
      // Allow Home and Tournament list to be public for better conversion
      const isPublicPage = pathname === '/' || pathname === '/tournaments' || isLoginPage;

      if (!userStr && !isPublicPage) {
        router.replace('/login');
      } else if (userStr && isLoginPage) {
        router.replace('/');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
