
import type {Metadata} from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'INDIA X E-SPORT | Ultimate Free Fire Arena',
  description: 'Join elite Free Fire tournaments, win cash prizes, and showcase your skills.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen pb-20 md:pb-0 md:pt-0">
        <FirebaseClientProvider>
          <main className="max-w-md mx-auto min-h-screen bg-background shadow-2xl relative border-x border-white/5">
            <AuthGuard>
              {children}
              <NavbarWrapper />
            </AuthGuard>
          </main>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

import { LayoutNavbarWrapper as NavbarWrapper } from '@/components/layout/NavbarWrapper';
