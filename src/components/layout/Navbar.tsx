
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Wallet, User, Home, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Tournaments', icon: Trophy, href: '/tournaments' },
  { label: 'Wallet', icon: Wallet, href: '/wallet' },
  { label: 'Profile', icon: User, href: '/profile' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:sticky md:top-0 md:bottom-auto">
      <div className="max-w-md mx-auto bg-card/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-all duration-200 w-full",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
