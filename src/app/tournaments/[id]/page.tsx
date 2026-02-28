"use client"

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, Share2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { joinTournamentAction, getUserBalance } from '@/app/actions';
import { Tournament } from '@/app/lib/types';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Mock data fetching for details
  const tournament: Tournament = {
    id: resolvedParams.id,
    title: 'Apex Grand Finals',
    description: 'Participate in the most competitive Free Fire tournament of the month. Battle against the best players and secure your spot in the hall of fame. Top 20 players get guaranteed prizes. Rules: No emulators, 4-finger allowed, level 40+ FF accounts only.',
    entryFee: 50,
    totalPrize: 5000,
    status: 'open',
    startTime: '2024-05-20T18:00:00Z',
    maxPlayers: 48,
    joinedCount: 32,
    map: 'Bermuda',
    type: 'Solo',
    imageUrl: PlaceHolderImages.find(img => img.id === 'tournament-1')?.imageUrl || ''
  };

  useEffect(() => {
    getUserBalance().then(setBalance);
  }, []);

  const handleJoin = async () => {
    setIsJoining(true);
    const result = await joinTournamentAction(tournament.id, tournament.entryFee);
    setIsJoining(false);

    if (result.success) {
      toast({
        title: "Registration Successful!",
        description: "You have been added to the match lobby.",
      });
      // Refresh balance
      getUserBalance().then(setBalance);
    } else {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: result.message,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-24">
      {/* Dynamic Hero Header */}
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
            <Badge className="bg-primary text-white border-none">{tournament.status.toUpperCase()}</Badge>
            <Badge variant="outline" className="text-white border-white/20 backdrop-blur-md">{tournament.type}</Badge>
          </div>
          <h1 className="text-3xl font-headline font-bold text-white leading-tight">{tournament.title}</h1>
        </div>
      </div>

      <div className="px-6 space-y-8 -mt-2">
        {/* Prize Pool & Entry Fee */}
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

        {/* Slot Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Joined Players</span>
            <span>{tournament.joinedCount} / {tournament.maxPlayers}</span>
          </div>
          <Progress value={(tournament.joinedCount / tournament.maxPlayers) * 100} className="h-2" />
        </div>

        {/* Details Grid */}
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

        {/* Description */}
        <div className="space-y-3">
          <h3 className="text-lg font-headline font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" /> Tournament Rules
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tournament.description}
          </p>
        </div>

        {/* Prize Distribution */}
        <div className="space-y-3">
          <h3 className="text-lg font-headline font-bold">Prize Distribution</h3>
          <div className="bg-card/40 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {[
              { rank: '1st', prize: '₹2000' },
              { rank: '2nd', prize: '₹1000' },
              { rank: '3rd', prize: '₹500' },
              { rank: '4th - 20th', prize: '₹100 each' },
            ].map((p, i) => (
              <div key={i} className="flex justify-between p-4 text-sm font-bold">
                <span className="text-muted-foreground">{p.rank}</span>
                <span className="text-primary">{p.prize}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button for Joining */}
      <div className="fixed bottom-20 left-0 right-0 p-4 max-w-md mx-auto">
        <div className="glass-morphism rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4 shadow-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Your Wallet</span>
            <span className="text-lg font-headline font-bold text-accent">₹{balance ?? '...'}</span>
          </div>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20"
            disabled={isJoining || (balance !== null && balance < tournament.entryFee)}
            onClick={handleJoin}
          >
            {isJoining ? 'JOINING...' : `PAY ₹${tournament.entryFee} TO JOIN`}
          </Button>
        </div>
      </div>
    </div>
  );
}
