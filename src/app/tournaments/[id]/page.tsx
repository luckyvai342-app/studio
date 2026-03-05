
"use client"

import { useState, use, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Clock, Users, Map as MapIcon, Shield, ChevronLeft, 
  Share2, Info, Loader2, AlertCircle, Gamepad2, Lock, Unlock, Zap, Medal, List, Target, Award, Copy, Check,
  Camera, Upload, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useCollection, useStorage } from '@/firebase';
import { doc, query, collection, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { joinTournamentAction } from '@/app/actions/tournament-actions';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user: authUser } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tournamentRef = doc(db, 'tournaments', resolvedParams.id);
  const { data: tournament, loading: tourneyLoading } = useDoc<any>(tournamentRef);
  
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const participantsQuery = useMemo(() => {
    return query(collection(db, 'tournaments', resolvedParams.id, 'participants'), orderBy('joinedAt', 'asc'));
  }, [db, resolvedParams.id]);

  const { data: participants } = useCollection<any>(participantsQuery);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser || !tournament) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `results/${tournament.id}/${authUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'tournaments', tournament.id, 'resultSubmissions'), {
        userId: authUser.uid,
        username: userProfile?.username || 'Unknown',
        tournamentId: tournament.id,
        tournamentTitle: tournament.title,
        screenshotUrl: downloadUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast({ title: "Result Submitted", description: "Admin will verify your victory soon." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsUploading(false);
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
           <TabsTrigger value="submit" className="flex-1 rounded-xl font-bold gap-2"><Camera className="w-3 h-3"/> SUBMIT</TabsTrigger>
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

          {isJoined && !isCompleted && (
            <Card className={cn("rounded-[2.5rem] overflow-hidden border-dashed transition-colors duration-500", isOngoing ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-white/10")}>
              <CardContent className="p-8 text-center">
                 {!isOngoing ? (
                   <div className="space-y-3">
                      <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <h4 className="font-headline font-bold uppercase tracking-tight text-muted-foreground">ROOM SECURED</h4>
                      <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">Credentials will reveal here when match is LIVE</p>
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
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(tournament.roomId, 'Room ID')} className="bg-white/5 rounded-xl"><Copy className="w-4 h-4" /></Button>
                        </div>
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                          <div className="text-left">
                            <p className="text-[8px] text-muted-foreground font-black uppercase mb-1 tracking-widest">Password</p>
                            <p className="font-headline text-2xl font-bold text-white tracking-widest">{tournament.roomPassword || 'PENDING'}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(tournament.roomPassword, 'Password')} className="bg-white/5 rounded-xl"><Copy className="w-4 h-4" /></Button>
                        </div>
                      </div>
                   </div>
                 )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="submit" className="animate-in-fade">
           <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
             <CardContent className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                   <ImageIcon className="w-10 h-10 text-primary" />
                </div>
                <div>
                   <h3 className="text-xl font-headline font-bold">Victory Proof</h3>
                   <p className="text-xs text-muted-foreground mt-1">Upload your match result screenshot for placement verification.</p>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />

                <Button 
                  className="w-full h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-black text-[10px] uppercase tracking-widest"
                  disabled={!isJoined || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                   {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                   {isJoined ? 'UPLOAD SCREENSHOT' : 'JOIN TO SUBMIT'}
                </Button>

                {!isJoined && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest">You must be a registered participant to submit results.</p>
                )}
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="players">
           {/* Participants list... */}
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
