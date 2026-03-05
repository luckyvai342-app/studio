
"use client"

import { useState, use, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, 
  Share2, Info, Loader2, AlertCircle, Gamepad2, Lock, Unlock, Zap, Medal, List, Target, Award, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, orderBy } from 'firebase/firestore';
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const tournamentRef = doc(db, 'tournaments', resolvedParams.id);
  const { data: tournament, loading: tourneyLoading } = useDoc<any>(tournamentRef);
  
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const participantsQuery = useMemo(() => {
    return query(collection(db, 'tournaments', resolvedParams.id, 'participants'), orderBy('joinedAt', 'asc'));
  }, [db, resolvedParams.id]);

  const leaderboardQuery = useMemo(() => {
    return query(collection(db, 'leaderboards', resolvedParams.id, 'entries'), orderBy('rank', 'asc'));
  }, [db, resolvedParams.id]);

  const { data: participants } = useCollection<any>(participantsQuery);
  const { data: leaderboardEntries } = useCollection<any>(leaderboardQuery);

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
      toast({ variant: "destructive", title: "Registration Failed", description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied", description: `${field} copied to clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
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
  const isJoined = !!participantData;
  const canAfford = userProfile && userProfile.walletBalance >= tournament.entryFee;
  const hasBattleAccount = userProfile?.gameUid && userProfile?.gameUsername;
  const isOngoing = tournament.status === 'ongoing';
  const isCompleted = tournament.status === 'completed';

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-40 bg-[#0D0D0D]">
      <div className="relative h-72 w-full">
        {tournament.imageUrl && <Image src={tournament.imageUrl} alt={tournament.title} fill className="object-cover opacity-80" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/40 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white" onClick={() => router.back()}><ChevronLeft className="w-6 h-6" /></Button>
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur-md rounded-2xl text-white"><Share2 className="w-5 h-5" /></Button>
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex gap-2 mb-2">
            <Badge className={cn("text-black border-none font-black uppercase tracking-widest px-2 py-1 rounded-lg text-[9px]", tournament.status === 'open' ? "bg-primary" : tournament.status === 'ongoing' ? "bg-emerald-500" : "bg-amber-500")}>{tournament.status?.toUpperCase()}</Badge>
            <Badge variant="outline" className="text-white border-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{tournament.type}</Badge>
          </div>
          <h1 className="text-3xl font-headline font-bold text-white leading-tight tracking-tighter uppercase">{tournament.title}</h1>
        </div>
      </div>

      <Tabs defaultValue="info" className="px-6 mt-6">
        <TabsList className="bg-white/5 border-white/5 w-full justify-start p-1 rounded-2xl mb-8">
           <TabsTrigger value="info" className="flex-1 rounded-xl font-bold gap-2"><Info className="w-3 h-3"/> INFO</TabsTrigger>
           <TabsTrigger value="players" className="flex-1 rounded-xl font-bold gap-2"><Users className="w-3 h-3"/> PLAYERS</TabsTrigger>
           <TabsTrigger value="leaderboard" className="flex-1 rounded-xl font-bold gap-2"><Award className="w-3 h-3"/> RESULTS</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-8 animate-in-fade">
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

          <div className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-2 text-foreground"><Users className="w-4 h-4 text-primary" /> Recruitment</span>
              <span>{tournament.joinedCount || 0} / {tournament.maxPlayers} JOINED</span>
            </div>
            <Progress value={Math.round(((tournament.joinedCount || 0) / (tournament.maxPlayers || 1)) * 100)} className="h-2.5 bg-white/10" />
          </div>

          {isJoined && !isCompleted && (
            <Card className={cn("rounded-[2.5rem] overflow-hidden border-dashed transition-colors duration-500", isOngoing ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-white/10")}>
              <CardContent className="p-8 text-center">
                 {!isOngoing ? (
                   <div className="space-y-3">
                      <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <h4 className="font-headline font-bold uppercase tracking-tight text-muted-foreground">ROOM SECURED</h4>
                      <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">Credentials will reveal here and via notification when match is LIVE</p>
                   </div>
                 ) : (
                   <div className="space-y-6 animate-in-fade">
                      <div className="flex flex-col items-center gap-2">
                        <Unlock className="w-10 h-10 text-emerald-500 animate-pulse" />
                        <h4 className="font-headline font-bold uppercase tracking-tight text-emerald-500">BATTLE READY</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                          <div className="text-left">
                            <p className="text-[8px] text-muted-foreground font-black uppercase mb-1 tracking-widest">Room ID</p>
                            <p className="font-headline text-2xl font-bold text-white tracking-widest">{tournament.roomId || 'PENDING'}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copyToClipboard(tournament.roomId, 'Room ID')}
                            className="bg-white/5 rounded-xl hover:bg-white/10"
                          >
                            {copiedField === 'Room ID' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                          <div className="text-left">
                            <p className="text-[8px] text-muted-foreground font-black uppercase mb-1 tracking-widest">Password</p>
                            <p className="font-headline text-2xl font-bold text-white tracking-widest">{tournament.roomPassword || 'PENDING'}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copyToClipboard(tournament.roomPassword, 'Password')}
                            className="bg-white/5 rounded-xl hover:bg-white/10"
                          >
                            {copiedField === 'Password' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <p className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest italic">Join the lobby immediately! Good luck, Warrior.</p>
                   </div>
                 )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-y-8 bg-white/5 p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-background rounded-2xl border border-white/10 text-primary"><Clock className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Combat Start</p>
                <p className="text-sm font-bold">{new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-background rounded-2xl border border-white/10 text-[#00E0FF]"><MapIcon className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Map Selection</p>
                <p className="text-sm font-bold">{tournament.map}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="players" className="animate-in-fade">
           <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
             <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                   {participants?.map((p: any, idx: number) => (
                     <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground">{idx + 1}</div>
                           <span className="font-bold text-sm tracking-tight">{p.username}</span>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 tracking-widest text-muted-foreground">ID: {p.gameUid?.substring(0, 5)}</Badge>
                     </div>
                   ))}
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="animate-in-fade">
           {isCompleted ? (
             <div className="space-y-4">
                <div className="px-2 flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Final Ranking</h4>
                  <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">Official Results</Badge>
                </div>
                {leaderboardEntries?.map((entry: any) => (
                  <Card key={entry.userId} className={cn(
                    "bg-[#1A1A1A]/60 border-white/5 rounded-2xl overflow-hidden transition-all duration-300",
                    entry.rank === 1 && "border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(0,255,136,0.1)]"
                  )}>
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-headline font-bold text-lg border",
                            entry.rank === 1 ? "bg-primary text-black border-primary" : 
                            entry.rank === 2 ? "bg-slate-400/10 text-slate-400 border-slate-400/20" :
                            entry.rank === 3 ? "bg-orange-700/10 text-orange-700 border-orange-700/20" :
                            "bg-white/5 text-muted-foreground border-white/5"
                          )}>
                            {entry.rank === 1 ? <Medal className="w-5 h-5" /> : entry.rank}
                          </div>
                          <div>
                             <p className="font-bold text-sm tracking-tight flex items-center gap-2">
                               {entry.username} 
                             </p>
                             <div className="flex items-center gap-3 mt-0.5">
                               <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                 <Target className="w-2.5 h-2.5 text-rose-500" /> {entry.kills} Kills
                               </span>
                               <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                 <Zap className="w-2.5 h-2.5 text-primary" /> {entry.score} Score
                               </span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-primary font-headline font-bold text-lg">₹{entry.prizeWon}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">SECURED</p>
                       </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
           ) : (
             <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">War in progress</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase">Results reveal after match completion</p>
             </div>
           )}
        </TabsContent>
      </Tabs>

      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="glass-morphism rounded-[2.5rem] p-6 border border-white/10 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Balance</span>
                  <span className="text-xl font-headline font-bold text-[#00E0FF]">₹{userProfile?.walletBalance ?? '0'}</span>
                </div>
                <Button 
                  className={cn("flex-1 font-black h-16 rounded-3xl uppercase tracking-tighter transition-all", isJoined ? "bg-emerald-500 text-white" : canAfford && !isFull && hasBattleAccount ? "bg-primary text-black shadow-primary/20" : "bg-white/5 text-muted-foreground")}
                  disabled={isJoining || (isFull && !isJoined) || (!canAfford && !isJoined) || !hasBattleAccount}
                  onClick={isJoined ? () => router.push('/profile') : handleJoin}
                >
                  {isJoining ? <Loader2 className="animate-spin" /> : isJoined ? 'ALREADY JOINED' : !hasBattleAccount ? 'LINK ID' : isFull ? 'ARENA FULL' : `JOIN: ₹${tournament.entryFee}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
