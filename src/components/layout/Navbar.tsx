
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Wallet, User, Home, Award, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { useMemo } from 'react';
import { query, collection, where } from 'firebase/firestore';

const navItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Battles', icon: Trophy, href: '/tournaments' },
  { label: 'Inbox', icon: Bell, href: '/notifications' },
  { label: 'Ranks', icon: Award, href: '/leaderboards' },
  { label: 'Wallet', icon: Wallet, href: '/wallet' },
];

export function Navbar() {
  const pathname = usePathname();
  const db = useFirestore();
  const { user: authUser } = useUser();

  const unreadQuery = useMemo(() => {
    if (!authUser) return null;
    return query(collection(db, 'notifications'), where('userId', '==', authUser.uid), where('read', '==', false));
  }, [db, authUser]);

  const { data: unreadNotifications } = useCollection<any>(unreadQuery);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:sticky md:top-0 md:bottom-auto">
      <div className="max-w-md mx-auto bg-card/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const isInbox = item.label === 'Inbox';
          const hasUnread = isInbox && unreadNotifications && unreadNotifications.length > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-all duration-200 w-full relative",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border border-background shadow-[0_0_5px_hsl(var(--primary))]" />
                )}
              </div>
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
