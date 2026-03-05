
"use client"

import { useState, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, Share2, Info, Loader2, AlertCircle, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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

  const handleJoin = async () => {
    if (!authUser || !userProfile || !tournament) return;
    
    // REQUIRE BATTLE ACCOUNT
    if (!userProfile.gameUid || !userProfile.gameUsername) {
      toast({ 
        variant: "destructive", 
        title: "Battle Identity Missing", 
        description: "Please link your Free Fire UID in your Profile before joining matches." 
      });
      router.push('/profile');
      return;
    }

    setIsJoining(true);
    try {
      await runTransaction(db, async (transaction) => {
        const tDoc = await transaction.get(tournamentRef);
        const uDoc = await transaction.get(userProfileRef!);
        
        if (!tDoc.exists()) throw new Error("Tournament not found");
        
        const tourneyData = tDoc.data();
        const userData = uDoc.data();
        
        const participantRef = doc(db, 'tournaments', tournament.id, 'participants', authUser.uid);
        const pDoc = await transaction.get(participantRef);
        
        if (pDoc.exists()) throw new Error("Already joined this tournament");
        if (tourneyData.joinedCount >= tourneyData.maxPlayers) throw new Error("Tournament is full");
        if (userData.walletBalance < tourneyData.entryFee) throw new Error("Insufficient balance");

        // ATOMIC UPDATES: Wallet + Capacity + Participant entry
        transaction.update(userProfileRef!, {
          walletBalance: userData.walletBalance - tourneyData.entryFee,
          lastActionAt: serverTimestamp()
        });

        transaction.update(tournamentRef, {
          joinedCount: (tourneyData.joinedCount || 0) + 1
        });

        transaction.set(participantRef, {
          username: userData.username,
          gameUid: userData.gameUid,
          gameUsername: userData.gameUsername,
          kills: 0,
          joinedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'audit_logs'));
        transaction.set(logRef, {
          userId: authUser.uid,
          action: 'JOIN_TOURNAMENT',
          details: `Joined ${tourneyData.title} (Fee: ${tourneyData.entryFee}) as ${userData.gameUsername} (${userData.gameUid})`,
          severity: 'info',
          timestamp: serverTimestamp()
        });
      });

      toast({ title: "Registration Successful!", description: "Welcome to the arena." });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: tournamentRef.path,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message || "Something went wrong",
        });
      }
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

  const isFull = (tournament.joinedCount || 0) >= (tournament.maxPlayers || 0);
  const canAfford = userProfile && userProfile.walletBalance >= tournament.entryFee;
  const hasBattleAccount = userProfile?.gameUid && userProfile?.gameUsername;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-40">
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
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60" onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex gap-2 mb-2">
            <Badge className="bg-primary text-black border-none font-black uppercase tracking-widest px-2 py-1 rounded-lg text-[9px]">
              {tournament.status?.toUpperCase() || 'OPEN'}
            </Badge>
            <Badge variant="outline" className="text-white border-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
              {tournament.type}
            </Badge>
          </div>
          <h1 className="text-3xl font-headline font-bold text-white leading-tight tracking-tighter uppercase">{tournament.title}</h1>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-6">
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

        <div className="space-y-3 bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2 text-foreground"><Users className="w-4 h-4 text-primary" /> Squad Status</span>
            <span>{tournament.joinedCount || 0} / {tournament.maxPlayers} Filled</span>
          </div>
          <Progress value={((tournament.joinedCount || 0) / (tournament.maxPlayers || 1)) * 100} className="h-2 bg-white/10" />
        </div>

        {!hasBattleAccount && (
          <Alert className="bg-amber-500/10 border-amber-500/20 rounded-2xl">
            <Gamepad2 className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs text-amber-500 font-bold uppercase tracking-tight">
              Action Required: Link your Free Fire UID in Profile to enable battle registration.
            </AlertDescription>
          </Alert>
        )}

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
                  canAfford && !isFull && hasBattleAccount ? "bg-primary text-black shadow-primary/20 hover:bg-primary/90" : "bg-white/5 text-muted-foreground"
                )}
                disabled={isJoining || isFull || !canAfford}
                onClick={handleJoin}
              >
                {isJoining ? (
                  <Loader2 className="animate-spin" />
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
