
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

  // COST OPTIMIZATION: Limit to 5 featured tournaments to save on read counts
  const tournamentsQuery = useMemo(() => {
    return query(
      collection(db, 'tournaments'),
      orderBy('startTime', 'desc'),
      limit(5)
    );
  }, [db]);

  const { data: tournaments, loading } = useCollection<any>(tournamentsQuery);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      <header className="p-4 flex justify-between items-center bg-background/50 sticky top-0 z-40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center rotate-12">
            <Zap className="text-white w-5 h-5 -rotate-12" />
          </div>
          <h1 className="text-xl font-headline font-bold gradient-text uppercase tracking-tighter">INDIA X E-SPORT</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
          </Button>
          <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-full border border-white/10">
            <span className="text-xs font-bold text-accent">₹500</span>
          </div>
        </div>
      </header>

      {heroImg?.imageUrl && (
        <section className="relative h-64 mx-4 mt-4 rounded-2xl overflow-hidden shadow-2xl group">
          <Image
            src={heroImg.imageUrl}
            alt="Hero Gaming"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            data-ai-hint="gaming setup"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <Badge className="mb-2 bg-primary/20 text-primary border-primary/50 backdrop-blur-md">LIVE EVENT</Badge>
            <h2 className="text-2xl font-headline font-bold leading-tight">Free Fire Sunday Cup</h2>
            <p className="text-sm text-muted-foreground mb-4">Jump in and dominate the arena.</p>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold group">
              REGISTER NOW <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 p-4 mt-2">
        <Card className="bg-card/40 border-white/5 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="text-primary w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Prizes Won</p>
              <p className="text-lg font-headline font-bold">₹12,450</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-white/5 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Users className="text-accent w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Users</p>
              <p className="text-lg font-headline font-bold">14.2k</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-headline font-bold">Featured Tournaments</h3>
          <Link href="/tournaments" className="text-primary text-xs font-bold flex items-center">
            View All <ChevronRight className="ml-1 w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments?.map((t: any) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <Card className="bg-card/40 border-white/10 transition-all duration-300 hover:scale-[1.02] group mb-4">
                  <div className="relative h-40 overflow-hidden rounded-t-lg">
                    {t.imageUrl && <Image src={t.imageUrl} alt={t.title} fill className="object-cover" />}
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-md">{t.type}</Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background to-transparent">
                      <h4 className="font-headline font-bold text-lg">{t.title}</h4>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-primary">Prize: ₹{t.totalPrize}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Entry: ₹{t.entryFee}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                        <span>Joined: {t.joinedCount}/{t.maxPlayers}</span>
                        <span>{Math.round((t.joinedCount / t.maxPlayers) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" 
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
