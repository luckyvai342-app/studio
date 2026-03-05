
"use client"

import { useState } from 'react';
import { Settings, LogOut, ShieldCheck, Gamepad2, Medal, User as UserIcon, ChevronRight, Trophy, Zap, Share2, Loader2, Save, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const userRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userData, loading } = useDoc<any>(userRef);

  const avatarImg = PlaceHolderImages.find(img => img.id === 'avatar-user');

  const [battleAccount, setBattleAccount] = useState({
    gameUid: '',
    gameUsername: '',
    gameRegion: 'India'
  });

  const handleCopyReferral = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      setIsCopied(true);
      toast({ title: "Referral Copied", description: "Share this code with your squad!" });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleUpdateBattleAccount = async () => {
    if (!userRef || !userData) return;
    
    if (!/^\d+$/.test(battleAccount.gameUid)) {
      toast({ variant: "destructive", title: "Invalid UID", description: "Free Fire UID must contain only numbers." });
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(userRef, {
        gameUid: battleAccount.gameUid,
        gameUsername: battleAccount.gameUsername,
        gameRegion: battleAccount.gameRegion,
        lastActionAt: serverTimestamp(),
      });
      toast({ title: "Account Linked", description: "Your battle identity has been secured." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ff_user');
    window.location.href = '/login';
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col min-h-screen animate-in-fade bg-[#0D0D0D] p-4 pb-24">
      <header className="flex justify-between items-center mb-10 mt-4">
        <h1 className="text-2xl font-headline font-bold tracking-tight uppercase italic">Battle Profile</h1>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl" onClick={handleCopyReferral}><Share2 className="w-5 h-5 text-primary" /></Button>
           <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl"><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex flex-col items-center mb-10 relative">
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] animate-pulse blur-xl" />
          <div className="relative w-full h-full rounded-[2.5rem] border-4 border-[#1A1A1A] overflow-hidden shadow-2xl">
            {avatarImg?.imageUrl && (
              <Image src={avatarImg.imageUrl} alt="Avatar" fill className="object-cover" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-2xl border-4 border-[#0D0D0D] shadow-lg">
            {userData?.accountVerified ? <ShieldCheck className="w-5 h-5 text-black" /> : <Zap className="w-5 h-5 text-black fill-black" />}
          </div>
        </div>
        <h2 className="text-2xl font-headline font-bold mb-2 tracking-tight">{userData?.username || 'Legend'}</h2>
        <div className="flex items-center gap-3">
          <Badge className="px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase bg-primary/10 text-primary border-primary/20">
            {userData?.role?.toUpperCase()} WARRIOR
          </Badge>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Medal className="w-3 h-3 text-primary" /> Matches: {userData?.matchesPlayed || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <Card className="bg-[#1A1A1A]/60 border-white/5 rounded-[2rem] p-6 text-center">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Referral Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-headline font-bold text-lg text-primary">{userData?.referralCode || '---'}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyReferral}>
              {isCopied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          </div>
        </Card>
        <Card className="bg-[#1A1A1A]/60 border-white/5 rounded-[2rem] p-6 text-center">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Elite Rank</p>
          <p className="font-headline font-bold text-lg text-[#00E0FF]">Level {Math.floor((userData?.matchesPlayed || 0) / 10) + 1}</p>
        </Card>
      </div>

      <Card className="bg-[#1A1A1A]/60 border-white/5 rounded-[2rem] overflow-hidden mb-10 backdrop-blur-md">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-sm font-headline flex items-center gap-2 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-primary" /> Identity Link
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Free Fire UID</Label>
            <Input 
              placeholder="Numeric UID"
              value={battleAccount.gameUid || userData?.gameUid || ''}
              onChange={(e) => setBattleAccount({...battleAccount, gameUid: e.target.value})}
              className="bg-background/50 border-white/5 rounded-xl h-12 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">In-Game Name</Label>
            <Input 
              placeholder="IGN"
              value={battleAccount.gameUsername || userData?.gameUsername || ''}
              onChange={(e) => setBattleAccount({...battleAccount, gameUsername: e.target.value})}
              className="bg-background/50 border-white/5 rounded-xl h-12 focus:border-primary/50"
            />
          </div>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-black font-black h-14 rounded-2xl mt-4 shadow-lg shadow-primary/10"
            disabled={isSaving}
            onClick={handleUpdateBattleAccount}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> UPDATE BATTLE ID</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {[
          { icon: Trophy, label: 'BATTLE HISTORY', href: '/tournaments' },
          { icon: Zap, label: 'ELITE ACHIEVEMENTS', href: '/leaderboards' },
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
    </div>
  );
}
