
"use client"

import { useMemo } from 'react';
import { Trophy, Medal, Target, Zap, ChevronLeft, Loader2, Award, Flame } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function LeaderboardsPage() {
  const db = useFirestore();

  const globalQuery = useMemo(() => {
    return query(collection(db, 'playerStats'), orderBy('totalScore', 'desc'), limit(50));
  }, [db]);

  const { data: players, loading } = useCollection<any>(globalQuery);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500/10 border-yellow-500/50 text-yellow-500";
      case 2: return "bg-slate-400/10 border-slate-400/50 text-slate-400";
      case 3: return "bg-orange-700/10 border-orange-700/50 text-orange-700";
      default: return "bg-white/5 border-white/5 text-muted-foreground";
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank <= 3) return <Medal className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] p-4 pb-24 animate-in-fade">
      <header className="flex items-center justify-between mb-8 mt-4">
        <Link href="/" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-headline font-bold tracking-tight uppercase italic">Hall of Fame</h1>
        <div className="w-10" />
      </header>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Trophy, label: 'Total Wins', value: players?.reduce((acc, p) => acc + (p.totalWins || 0), 0) || 0, color: 'text-yellow-500' },
          { icon: Target, label: 'Total Kills', value: players?.reduce((acc, p) => acc + (p.totalKills || 0), 0) || 0, color: 'text-rose-500' },
          { icon: Zap, label: 'Elite Points', value: players?.reduce((acc, p) => acc + (p.totalScore || 0), 0) || 0, color: 'text-primary' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white/5 border-white/5 rounded-2xl overflow-hidden p-3 text-center">
            <stat.icon className={cn("w-4 h-4 mx-auto mb-2", stat.color)} />
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-sm font-headline font-bold">{stat.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="bg-[#1A1A1A] border border-white/5 w-full h-14 p-1 rounded-2xl mb-8">
          <TabsTrigger value="global" className="flex-1 rounded-xl font-bold gap-2">
            <Award className="w-4 h-4" /> GLOBAL
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 rounded-xl font-bold gap-2">
            <Flame className="w-4 h-4" /> WEEKLY
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {players?.map((player: any, idx: number) => {
                const rank = idx + 1;
                return (
                  <Card key={player.userId} className={cn(
                    "bg-[#1A1A1A]/40 border-white/5 rounded-[1.5rem] transition-all duration-300",
                    rank <= 3 && "bg-white/[0.03] border-white/10"
                  )}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-headline font-bold border",
                          getRankStyle(rank)
                        )}>
                          {getMedalIcon(rank) || rank}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{player.username}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                              <Target className="w-2.5 h-2.5 text-rose-500" /> {player.totalKills} Kills
                            </span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5 text-yellow-500" /> {player.totalWins} Wins
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-primary font-headline font-bold text-lg leading-none">{player.totalScore}</p>
                        <p className="text-[8px] font-black text-muted-foreground uppercase mt-1">EPIC PTS</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="text-center py-20">
          <Flame className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Season Resetting</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase">Weekly resets coming in next update</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
