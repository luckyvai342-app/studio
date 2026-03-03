
"use client"

import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Users, Zap, Bell, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function Home() {
  const db = useFirestore();
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-gaming');

  const tournamentsQuery = useMemo(() => {
    return query(
      collection(db, 'tournaments'),
      orderBy('startTime', 'desc'),
      limit(5)
    );
  }, [db]);

  const { data: tournaments, loading } = useCollection<any>(tournamentsQuery);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in bg-background">
      <header className="p-4 flex justify-between items-center bg-background/80 sticky top-0 z-40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center rotate-3 shadow-[0_0_15px_rgba(0,255,136,0.4)]">
            <Zap className="text-black w-5 h-5 -rotate-3 fill-black" />
          </div>
          <h1 className="text-xl font-headline font-bold gradient-text uppercase tracking-tighter">INDIA X E-SPORT</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="relative hover:bg-white/5">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background animate-pulse" />
          </Button>
          <div className="flex items-center gap-2 bg-secondary/50 px-4 py-1.5 rounded-full border border-white/5">
            <span className="text-xs font-bold text-primary">₹500</span>
          </div>
        </div>
      </header>

      {heroImg?.imageUrl && (
        <section className="relative h-72 mx-4 mt-6 rounded-[2rem] overflow-hidden shadow-2xl group border border-white/5">
          <Image
            src={heroImg.imageUrl}
            alt="Hero Gaming"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
            data-ai-hint="gaming setup"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <Badge className="mb-3 bg-primary text-black font-bold border-none px-3 py-1">LIVE EVENT</Badge>
            <h2 className="text-3xl font-headline font-bold leading-tight mb-2">Free Fire Sunday Cup</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-[80%]">Compete with the best and claim your share of the massive prize pool.</p>
            <Button className="w-full bg-primary hover:bg-primary/90 text-black font-extrabold h-12 rounded-2xl group shadow-[0_5px_20px_rgba(0,255,136,0.3)]">
              REGISTER NOW <ChevronRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 p-4 mt-2">
        <Card className="bg-card/60 border-white/5 overflow-hidden rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Trophy className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Prizes Won</p>
              <p className="text-xl font-headline font-bold">₹12,450</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-white/5 overflow-hidden rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Users className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active Users</p>
              <p className="text-xl font-headline font-bold">14.2k</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="p-4 mb-20">
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-xl font-headline font-bold">Featured Tournaments</h3>
          <Link href="/tournaments" className="text-primary text-xs font-black flex items-center uppercase tracking-wider">
            Explore <ChevronRight className="ml-1 w-4 h-4" />
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
                <Card className="bg-card/40 border-white/10 transition-all duration-300 hover:scale-[1.02] group rounded-[1.5rem] overflow-hidden neon-border hover:border-primary/50">
                  <div className="relative h-44 overflow-hidden">
                    {t.imageUrl && <Image src={t.imageUrl} alt={t.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-md border-white/10 text-[10px] font-black">{t.type}</Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-background to-transparent">
                      <h4 className="font-headline font-bold text-xl">{t.title}</h4>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <span className="text-base font-bold text-primary">₹{t.totalPrize}</span>
                      </div>
                      <div className="text-xs font-black text-muted-foreground bg-white/5 px-3 py-1 rounded-full">ENTRY: ₹{t.entryFee}</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                        <span>Players: {t.joinedCount}/{t.maxPlayers}</span>
                        <span className="text-primary">{Math.round((t.joinedCount / t.maxPlayers) * 100)}% FULL</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-[#00E0FF] transition-all duration-700 shadow-[0_0_10px_rgba(0,255,136,0.5)]" 
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
