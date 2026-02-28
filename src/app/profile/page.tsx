import { Settings, LogOut, ShieldCheck, Gamepad2, Medal, User as UserIcon, ChevronRight, Trophy } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const avatarImg = PlaceHolderImages.find(img => img.id === 'avatar-user');

  return (
    <div className="flex flex-col min-h-screen animate-fade-in p-4 pb-24">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-headline font-bold">Profile</h1>
        <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
      </header>

      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="relative w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
          {avatarImg?.imageUrl && (
            <Image src={avatarImg.imageUrl} alt="Avatar" fill className="rounded-full border-4 border-card object-cover" />
          )}
          <div className="absolute bottom-1 right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-background" />
        </div>
        <h2 className="text-xl font-headline font-bold mb-1">GhostRider_FF</h2>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-card/60 px-3 py-1 rounded-full border border-white/5">
          <Gamepad2 className="w-3 h-3 text-primary" /> FF ID: 529381023
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Played', value: '142', icon: Gamepad2, color: 'text-primary' },
          { label: 'Wins', value: '38', icon: Trophy, color: 'text-accent' },
          { label: 'Kills', value: '1,204', icon: ShieldCheck, color: 'text-rose-500' },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/40 border-white/5 text-center">
            <CardContent className="p-4 flex flex-col items-center">
              <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
              <p className="text-lg font-headline font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Menu Options */}
      <div className="space-y-3">
        {[
          { icon: UserIcon, label: 'Account Information' },
          { icon: ShieldCheck, label: 'Identity Verification' },
          { icon: Medal, label: 'Achievements & Badges' },
          { icon: LogOut, label: 'Log Out', danger: true },
        ].map((item, i) => (
          <Button 
            key={i} 
            variant="ghost" 
            className={cn(
              "w-full justify-between h-14 px-4 bg-card/20 hover:bg-card/40 border border-white/5 rounded-2xl",
              item.danger && "text-rose-500 hover:text-rose-400 hover:bg-rose-500/5"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl bg-background", !item.danger && "text-primary")}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            {!item.danger && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </Button>
        ))}
      </div>

      <div className="mt-auto text-center py-8">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">INDIA X E-SPORT V1.1.0</p>
        <p className="text-[10px] text-muted-foreground">Made with ❤️ for the gaming community</p>
      </div>
    </div>
  );
}
