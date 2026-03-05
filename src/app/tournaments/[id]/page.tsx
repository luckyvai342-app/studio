
"use client"

import { useState, use, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, 
  Share2, Info, Loader2, AlertCircle, Gamepad2, Lock, Unlock, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { joinTournamentAction } from '@/app/actions/tournament-actions';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [isJoining, setIsJoining] = useState(false);

  const tournamentRef = doc(db, 'tournaments', resolvedParams.id);
  const { data: tournament, loading: tourneyLoading } = useDoc<any>(tournamentRef);
  
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile } = useDoc<any>(userProfileRef);

  // Check if current user is a participant
  const participantRef = authUser ? doc(db, 'tournaments', resolvedParams.id, 'participants', authUser.uid) : null;
  const { data: participantData } = useDoc<any>(participantRef);

  const handleJoin = async () => {
    if (!authUser || !userProfile || !tournament) return;
    
    setIsJoining(true);
    try {
      const result = await joinTournamentAction(tournament.id, authUser.uid);
      if (result.success) {
        toast({ title: "Registration Successful!", description: "Welcome to the arena, Warrior." });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (tourneyLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
    </div>
  );

  if (!tournament) return (
    <div className="flex flex-col h-screen items-center justify-center p-8 text-center gap-4">
      <AlertCircle className="w-12 h-12 text-rose-500" />
      <h2 className="text-xl font-bold">Tournament Not Found</h2>
      <Button variant="ghost" onClick={() => router.push('/')}>Go Home</Button>
    </div>
  );

  const isFull = tournament.status === 'full' || (tournament.joinedCount || 0) >= (tournament.maxPlayers || 0);
  const isJoined = !!participantData;
  const canAfford = userProfile && userProfile.walletBalance >= tournament.entryFee;
  const hasBattleAccount = userProfile?.gameUid && userProfile?.gameUsername;
  const isOngoing = tournament.status === 'ongoing';

  const fillPercentage = Math.round(((tournament.joinedCount || 0) / (tournament.maxPlayers || 1)) * 100);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-40 bg-[#0D0D0D]">
      {/* Hero Header */}
      <div className="relative h-72 w-full">
        {tournament.imageUrl && (
          <Image 
            src={tournament.imageUrl} 
            alt={tournament.title} 
            fill 
            className="object-cover opacity-80" 
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/40 to-transparent" />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white" onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex gap-2 mb-2">
            <Badge className={cn(
              "text-black border-none font-black uppercase tracking-widest px-2 py-1 rounded-lg text-[9px]",
              tournament.status === 'open' ? "bg-primary" : "bg-amber-500"
            )}>
              {tournament.status?.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-white border-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
              {tournament.type}
            </Badge>
          </div>
          <h1 className="text-3xl font-headline font-bold text-white leading-tight tracking-tighter uppercase">{tournament.title}</h1>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-6">
        {/* Prize & Fee Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20 rounded-[2rem]">
            <CardContent className="p-5">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Grand Prize</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-2xl font-headline font-bold text-primary">₹{tournament.totalPrize.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 rounded-[2rem]">
            <CardContent className="p-5">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Entry Fee</p>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00E0FF]" />
                <span className="text-2xl font-headline font-bold text-white">₹{tournament.entryFee}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Slot Progress */}
        <div className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2 text-foreground"><Users className="w-4 h-4 text-primary" /> Recruitment</span>
            <span className={cn(fillPercentage >= 90 ? "text-rose-500" : "text-primary")}>
              {tournament.joinedCount || 0} / {tournament.maxPlayers} JOINED
            </span>
          </div>
          <div className="relative">
             <Progress value={fillPercentage} className="h-2.5 bg-white/10" />
             <div className="flex justify-between mt-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{fillPercentage}% FILLED</span>
                <span className="text-[9px] font-bold text-primary uppercase">{(tournament.maxPlayers || 0) - (tournament.joinedCount || 0)} SLOTS LEFT</span>
             </div>
          </div>
        </div>

        {/* Room Credentials Section */}
        {isJoined && (
          <Card className={cn(
            "rounded-[2.5rem] overflow-hidden border-dashed transition-all duration-500",
            isOngoing ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"
          )}>
            <CardContent className="p-8 text-center">
               {!isOngoing ? (
                 <div className="space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                      <Lock className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold uppercase tracking-tight">ROOM SECURED</h4>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Credentials reveal when match is LIVE</p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6 animate-in-fade">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30 animate-pulse">
                      <Unlock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-muted-foreground font-black uppercase mb-1">Room ID</p>
                        <p className="font-headline text-xl font-bold text-white tracking-widest">{tournament.roomId || '---'}</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-muted-foreground font-black uppercase mb-1">Password</p>
                        <p className="font-headline text-xl font-bold text-white tracking-widest">{tournament.roomPassword || '---'}</p>
                      </div>
                    </div>
                    <Alert className="bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <AlertDescription className="text-[10px] text-emerald-500 font-bold uppercase">
                        Battle is live! Enter credentials in Free Fire Custom Room.
                      </AlertDescription>
                    </Alert>
                 </div>
               )}
            </CardContent>
          </Card>
        )}

        {!hasBattleAccount && (
          <Alert className="bg-amber-500/10 border-amber-500/20 rounded-2xl">
            <Gamepad2 className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs text-amber-500 font-bold uppercase tracking-tight">
              Action Required: Link your Free Fire UID in Profile to enable battle registration.
            </AlertDescription>
          </Alert>
        )}

        {/* Combat Details */}
        <div className="grid grid-cols-2 gap-y-8 bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-background rounded-2xl border border-white/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Combat Start</p>
              <p className="text-sm font-bold">{new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-background rounded-2xl border border-white/10 text-[#00E0FF]">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Map Selection</p>
              <p className="text-sm font-bold">{tournament.map}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Join Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="glass-morphism rounded-[2.5rem] p-6 border border-white/10 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your Balance</span>
                <span className="text-xl font-headline font-bold text-[#00E0FF]">₹{userProfile?.walletBalance?.toLocaleString() ?? '0'}</span>
              </div>
              <Button 
                className={cn(
                  "flex-1 font-black h-16 rounded-3xl shadow-lg transition-all active:scale-95 text-base uppercase tracking-tighter",
                  isJoined ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                  canAfford && !isFull && hasBattleAccount ? "bg-primary text-black shadow-primary/20 hover:bg-primary/90" : "bg-white/5 text-muted-foreground"
                )}
                disabled={isJoining || (isFull && !isJoined) || (!canAfford && !isJoined) || !hasBattleAccount}
                onClick={isJoined ? () => router.push('/profile') : handleJoin}
              >
                {isJoining ? (
                  <Loader2 className="animate-spin" />
                ) : isJoined ? (
                  'ALREADY JOINED'
                ) : !hasBattleAccount ? (
                  'LINK BATTLE ID'
                ) : isFull ? (
                  'ARENA FULL'
                ) : !canAfford ? (
                  'LOCKED: ₹' + tournament.entryFee
                ) : (
                  `JOIN BATTLE: ₹${tournament.entryFee}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
