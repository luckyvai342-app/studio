
import type {Metadata} from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'FreeFire Apex | Ultimate Esports Arena',
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
        <main className="max-w-md mx-auto min-h-screen bg-background shadow-2xl relative border-x border-white/5">
          {children}
          <Navbar />
        </main>
        <Toaster />
      </body>
    </html>
  );
}
