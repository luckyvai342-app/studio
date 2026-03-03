
"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, ShieldCheck, Gamepad2, Medal, User as UserIcon, ChevronRight, Trophy, Zap, Share2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const avatarImg = PlaceHolderImages.find(img => img.id === 'avatar-user');

  useEffect(() => {
    const user = localStorage.getItem('ff_user');
    if (user) {
      setUserData(JSON.parse(user));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ff_user');
    router.push('/login');
  };

  if (!userData) return null;

  return (
    <div className="flex flex-col min-h-screen animate-in-fade bg-[#0D0D0D] p-4 pb-24">
      <header className="flex justify-between items-center mb-10 mt-4">
        <h1 className="text-2xl font-headline font-bold tracking-tight">Warrior Profile</h1>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl"><Share2 className="w-5 h-5 text-primary" /></Button>
           <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl"><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      {/* Premium Profile Header */}
      <div className="flex flex-col items-center mb-10 relative">
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] animate-pulse blur-xl" />
          <div className="relative w-full h-full rounded-[2.5rem] border-4 border-[#1A1A1A] overflow-hidden shadow-2xl">
            {avatarImg?.imageUrl && (
              <Image src={avatarImg.imageUrl} alt="Avatar" fill className="object-cover" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-2xl border-4 border-[#0D0D0D] shadow-lg">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
        </div>
        <h2 className="text-2xl font-headline font-bold mb-2 tracking-tight">{userData.name}</h2>
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase">
            LVL 42 PRO
          </Badge>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Gamepad2 className="w-3 h-3 text-primary" /> ID: {userData.ffid}
          </div>
        </div>
      </div>

      {/* High-Impact Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Battles', value: '142', icon: Gamepad2, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Victory', value: '38', icon: Trophy, color: 'text-[#00E0FF]', bg: 'bg-[#00E0FF]/5' },
          { label: 'Kills', value: '1.2k', icon: ShieldCheck, color: 'text-rose-500', bg: 'bg-rose-500/5' },
        ].map((stat, i) => (
          <Card key={i} className="bg-[#1A1A1A]/40 border-white/5 text-center rounded-[2rem] group hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-6 flex flex-col items-center">
              <div className={cn("p-3 rounded-2xl mb-3 transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-xl font-headline font-bold tracking-tight">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Polished Menu Options */}
      <div className="space-y-4">
        {[
          { icon: UserIcon, label: 'BATTLE ACCOUNT SETTINGS' },
          { icon: ShieldCheck, label: 'IDENTITY VERIFICATION' },
          { icon: Medal, label: 'ELITE ACHIEVEMENTS' },
          { icon: LogOut, label: 'TERMINATE SESSION', danger: true, onClick: handleLogout },
        ].map((item, i) => (
          <Button 
            key={i} 
            variant="ghost" 
            onClick={item.onClick}
            className={cn(
              "w-full justify-between h-16 px-6 bg-[#1A1A1A]/20 hover:bg-[#1A1A1A]/40 border border-white/5 rounded-3xl transition-all duration-300 group",
              item.danger && "text-rose-500 hover:text-rose-400 hover:bg-rose-500/5"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-2.5 rounded-xl bg-[#0D0D0D] border border-white/5", !item.danger && "text-primary")}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
            </div>
            {!item.danger && <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          </Button>
        ))}
      </div>

      <div className="mt-12 text-center pb-10">
        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mb-2 opacity-30">INDIA X E-SPORT V1.1.0</p>
        <div className="flex items-center justify-center gap-2 opacity-50">
          <div className="h-[1px] w-8 bg-white/10" />
          <p className="text-[9px] text-muted-foreground font-bold italic tracking-wider">ESTABLISHED FOR LEGENDS</p>
          <div className="h-[1px] w-8 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
