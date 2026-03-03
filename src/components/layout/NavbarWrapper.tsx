
"use client"

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function LayoutNavbarWrapper() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <Navbar />;
}
