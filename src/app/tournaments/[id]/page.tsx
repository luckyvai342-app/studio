
"use client"

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, Share2, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tournament } from '@/app/lib/types';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [isJoining, setIsJoining] = useState(false);

  // Real-time data fetching
  const tournamentRef = doc(db, 'tournaments', resolvedParams.id);
  const { data: tournament, loading: tourneyLoading } = useDoc<any>(tournamentRef);
  
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const handleJoin = async () => {
    if (!authUser || !userProfile || !tournament) return;
    
    setIsJoining(true);
    try {
      await runTransaction(db, async (transaction) => {
        const tDoc = await transaction.get(tournamentRef);
        const uDoc = await transaction.get(userProfileRef!);
        
        if (!tDoc.exists()) throw new Error("Tournament not found");
        
        const tourneyData = tDoc.data();
        const userData = uDoc.data();
        
        // 1. Duplicate Join Protection
        const participantRef = doc(db, 'tournaments', tournament.id, 'participants', authUser.uid);
        const pDoc = await transaction.get(participantRef);
        if (pDoc.exists()) throw new Error("Already joined this tournament");

        // 2. Capacity Check
        if (tourneyData.joinedCount >= tourneyData.maxPlayers) throw new Error("Tournament is full");

        // 3. Double Payment Protection (Balance Check)
        if (userData.walletBalance < tourneyData.entryFee) throw new Error("Insufficient balance");

        // 4. Atomic Mutation
        transaction.update(userProfileRef!, {
          walletBalance: userData.walletBalance - tourneyData.entryFee,
          lastActionAt: new Date().toISOString()
        });

        transaction.update(tournamentRef, {
          joinedCount: tourneyData.joinedCount + 1
        });

        transaction.set(participantRef, {
          username: userData.username,
          kills: 0,
          joinedAt: serverTimestamp()
        });

        // 5. Audit Log (Fraud Detection)
        const logRef = doc(collection(db, 'audit_logs'));
        transaction.set(logRef, {
          userId: authUser.uid,
          action: 'JOIN_TOURNAMENT',
          details: `Joined ${tourneyData.title} (Fee: ${tourneyData.entryFee})`,
          severity: 'info',
          timestamp: serverTimestamp()
        });
      });

      toast({ title: "Registration Successful!", description: "Welcome to the arena." });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Something went wrong",
      });
      
      // Log suspicious activity if it's a balance or duplicate issue
      if (error.message.includes("Insufficient balance") || error.message.includes("Already joined")) {
        const logRef = doc(collection(db, 'audit_logs'));
        // In a real app, this would be a separate firestore write
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (tourneyLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!tournament) return <div className="p-8 text-center">Tournament not found</div>;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-24">
      <div className="relative h-72 w-full">
        {tournament.imageUrl && (
          <Image src={tournament.imageUrl} alt={tournament.title} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Button variant="ghost" size="icon" className="bg-background/20 backdrop-blur-md rounded-full text-white" onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="bg-background/20 backdrop-blur-md rounded-full text-white">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex gap-2 mb-2">
            <Badge className="bg-primary text-white border-none">{tournament.status?.toUpperCase()}</Badge>
            <Badge variant="outline" className="text-white border-white/20 backdrop-blur-md">{tournament.type}</Badge>
          </div>
          <h1 className="text-3xl font-headline font-bold text-white leading-tight">{tournament.title}</h1>
        </div>
      </div>

      <div className="px-6 space-y-8 -mt-2">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Prize Pool</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-xl font-headline font-bold text-primary">₹{tournament.totalPrize}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Entry Fee</p>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-xl font-headline font-bold text-accent">₹{tournament.entryFee}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Joined Players</span>
            <span>{tournament.joinedCount} / {tournament.maxPlayers}</span>
          </div>
          <Progress value={(tournament.joinedCount / tournament.maxPlayers) * 100} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-y-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-card rounded-lg border border-white/5">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Starts At</p>
              <p className="text-sm font-bold">{new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-card rounded-lg border border-white/5">
              <MapIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Map</p>
              <p className="text-sm font-bold">{tournament.map}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-headline font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" /> Tournament Rules
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tournament.description}
          </p>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 max-w-md mx-auto">
        <div className="glass-morphism rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4 shadow-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Your Wallet</span>
            <span className="text-lg font-headline font-bold text-accent">₹{userProfile?.walletBalance ?? '0'}</span>
          </div>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20"
            disabled={isJoining || (userProfile && userProfile.walletBalance < tournament.entryFee)}
            onClick={handleJoin}
          >
            {isJoining ? <Loader2 className="animate-spin" /> : `PAY ₹${tournament.entryFee} TO JOIN`}
          </Button>
        </div>
      </div>
    </div>
  );
}
