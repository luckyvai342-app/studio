
"use client"

import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Users, Zap, Bell, ChevronRight, Loader2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function Home() {
  const db = useFirestore();
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-gaming');

  const tournamentsQuery = useMemo(() => {
    return query(
      collection(db, 'tournaments'),
      orderBy('startTime', 'desc'),
      limit(3)
    );
  }, [db]);

  const { data: tournaments, loading } = useCollection<any>(tournamentsQuery);

  return (
    <div className="flex flex-col min-h-screen animate-in-fade bg-[#0D0D0D]">
      {/* Sticky Header */}
      <header className="p-4 flex justify-between items-center bg-[#0D0D0D]/80 sticky top-0 z-50 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center rotate-3 shadow-[0_0_20px_rgba(0,255,136,0.4)]">
            <Zap className="text-black w-6 h-6 -rotate-3 fill-black" />
          </div>
          <h1 className="text-xl font-headline font-bold gradient-text uppercase tracking-tighter">INDIA X E-SPORT</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-white/5">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background animate-pulse" />
          </Button>
          <Link href="/wallet" className="flex items-center gap-2 bg-primary/10 pl-3 pr-1 py-1 rounded-xl border border-primary/20 group">
            <span className="text-xs font-black text-primary">₹500</span>
            <div className="bg-primary p-1 rounded-lg">
              <ArrowUpRight className="w-3 h-3 text-black" />
            </div>
          </Link>
        </div>
      </header>

      {/* Featured Hero */}
      <section className="px-4 mt-6">
        <div className="relative h-64 w-full rounded-[2.5rem] overflow-hidden shadow-2xl group border border-white/5">
          {heroImg?.imageUrl && (
            <Image
              src={heroImg.imageUrl}
              alt="Hero Gaming"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70"
              data-ai-hint="gaming setup"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <Badge className="mb-3 bg-primary text-black font-black uppercase tracking-widest px-3 py-1 rounded-lg text-[10px]">Grand Prize Pool</Badge>
            <h2 className="text-3xl font-headline font-bold leading-tight mb-2 tracking-tighter">Sunday Cup Royale</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">₹25,000</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-muted-foreground">Squad Mode</span>
              </div>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-black font-black h-14 rounded-2xl group shadow-[0_5px_30px_rgba(0,255,136,0.3)]">
              JOIN THE BATTLE <ChevronRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-2 gap-4 p-4">
        <Card className="bg-[#1A1A1A]/60 border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-2">
              <Trophy className="text-primary w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Prizes Distributed</p>
            <p className="text-xl font-headline font-bold tracking-tight">₹1.2M+</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A]/60 border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="p-3 bg-primary/10 rounded-2xl w-fit mb-2">
              <Users className="text-primary w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active Warriors</p>
            <p className="text-xl font-headline font-bold tracking-tight">14,240</p>
          </CardContent>
        </Card>
      </section>

      {/* Matches Section */}
      <section className="p-4 mb-24">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-xl font-headline font-bold tracking-tight">Active Tournaments</h3>
          <Link href="/tournaments" className="text-primary text-[10px] font-black flex items-center uppercase tracking-widest bg-primary/5 px-3 py-2 rounded-full border border-primary/10 hover:bg-primary/10 transition-colors">
            View All <ChevronRight className="ml-1 w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : (
          <div className="space-y-6">
            {tournaments?.map((t: any) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <Card className="bg-[#1A1A1A]/40 border-white/5 transition-all duration-300 hover:scale-[1.02] group rounded-[2rem] overflow-hidden neon-border">
                  <div className="relative h-44 overflow-hidden">
                    {t.imageUrl && (
                      <Image 
                        src={t.imageUrl} 
                        alt={t.title} 
                        fill 
                        className="object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 scale-105 group-hover:scale-100" 
                      />
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">{t.type}</Badge>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full p-6">
                      <h4 className="font-headline font-bold text-2xl tracking-tight leading-none">{t.title}</h4>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Total Prize</span>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-primary" />
                          <span className="text-xl font-headline font-bold text-primary">₹{t.totalPrize}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Entry Fee</span>
                        <div className="bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                          <span className="text-sm font-bold">₹{t.entryFee}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                        <span>Players: {t.joinedCount}/{t.maxPlayers}</span>
                        <span className="text-primary">{Math.round((t.joinedCount / t.maxPlayers) * 100)}% Reached</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[2px]">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-[#00E0FF] transition-all duration-1000 shadow-[0_0_15px_rgba(0,255,136,0.6)] rounded-full" 
                          style={{ width: `${(t.joinedCount / t.maxPlayers) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
