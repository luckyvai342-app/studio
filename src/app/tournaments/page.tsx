
"use client"

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, ChevronLeft, Filter, Loader2, Users, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function TournamentListPage() {
  const db = useFirestore();
  const tournamentsQuery = useMemo(() => {
    return query(
      collection(db, 'tournaments'),
      orderBy('startTime', 'desc')
    );
  }, [db]);

  const { data: tournaments, loading } = useCollection<any>(tournamentsQuery);

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] p-4 pb-24">
      <header className="flex flex-col gap-6 mb-8 mt-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-headline font-bold tracking-tight">Tournaments</h1>
          <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl">
            <Filter className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search battles..." 
            className="bg-[#1A1A1A] border-white/5 pl-12 h-14 rounded-2xl focus:border-primary/50 text-sm"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {tournaments?.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">No active tournaments found.</p>
            </div>
          ) : (
            tournaments?.map((t: any) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="block group">
                <Card className="bg-[#1A1A1A]/40 border-white/5 rounded-[2rem] overflow-hidden group-hover:border-primary/30 transition-all duration-300">
                  <div className="relative h-32">
                    {t.imageUrl && <Image src={t.imageUrl} alt={t.title} fill className="object-cover opacity-50 group-hover:opacity-80 transition-opacity" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent" />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] uppercase font-black px-2 py-1 rounded-lg">{t.status}</Badge>
                    </div>
                    <div className="absolute bottom-4 left-6">
                      <h3 className="text-xl font-headline font-bold group-hover:text-primary transition-colors">{t.title}</h3>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-primary" />
                            <span className="text-base font-bold text-primary">₹{t.totalPrize}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-bold text-muted-foreground">{t.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Entry Fee:</span>
                           <span className="text-xs font-bold px-2 py-0.5 bg-white/5 rounded-md">₹{t.entryFee}</span>
                        </div>
                      </div>
                      <Button className="rounded-xl h-10 px-6 font-bold bg-primary text-black hover:bg-primary/90">
                        JOIN
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
