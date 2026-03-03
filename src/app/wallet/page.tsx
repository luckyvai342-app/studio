"use client"

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, CreditCard, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function WalletPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();

  // Real-time user profile for wallet balance
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile, loading: userLoading } = useDoc<any>(userProfileRef);

  // Real-time transaction history
  const transactionsQuery = useMemo(() => {
    if (!authUser) return null;
    return query(
      collection(db, 'users', authUser.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, authUser]);

  const { data: transactions, loading: txLoading } = useCollection<any>(transactionsQuery);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-primary" />;
      case 'pending': return <Clock className="w-3 h-3 text-amber-500" />;
      case 'failed': return <XCircle className="w-3 h-3 text-rose-500" />;
      default: return null;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'deposit': case 'prize': return 'text-primary';
      case 'withdrawal': case 'entry_fee': return 'text-rose-500';
      default: return 'text-foreground';
    }
  };

  const getSymbol = (type: string) => {
    switch (type) {
      case 'deposit': case 'prize': return '+';
      case 'withdrawal': case 'entry_fee': return '-';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-in-fade bg-[#0D0D0D] p-4 pb-24">
      <header className="flex items-center justify-between mb-8 mt-4">
        <Link href="/" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-headline font-bold tracking-tight">Finances</h1>
        <div className="w-10" />
      </header>

      {/* Real-time Wallet Card */}
      <Card className="bg-gradient-to-br from-[#00FF88] to-[#00A3FF] border-none shadow-[0_20px_50px_rgba(0,255,136,0.3)] mb-10 overflow-hidden relative rounded-[2.5rem] h-64">
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <CreditCard className="w-64 h-64 text-black" />
        </div>
        <CardContent className="p-10 flex flex-col justify-between h-full relative z-10">
          <div>
            <p className="text-black/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Total Credits Available</p>
            <h2 className="text-5xl font-headline font-bold text-black tracking-tighter">
              {userLoading ? (
                <Loader2 className="animate-spin w-8 h-8" />
              ) : (
                `₹${userProfile?.walletBalance?.toLocaleString() ?? '0'}`
              )}
            </h2>
          </div>
          <div className="flex gap-4">
            <Button className="flex-1 bg-black text-white hover:bg-black/90 font-black h-16 rounded-3xl shadow-2xl transition-transform active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> TOP UP
            </Button>
            <Button variant="outline" className="flex-1 border-black/20 bg-black/10 text-black hover:bg-black/20 font-black h-16 rounded-3xl transition-transform active:scale-95">
              PAYOUT
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-xl font-headline font-bold tracking-tight">Activity Logs</h3>
          <Badge variant="outline" className="border-white/5 text-muted-foreground uppercase font-black text-[9px] tracking-widest px-3 py-1 rounded-full">REAL-TIME</Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-[#1A1A1A] border border-white/5 mb-8 p-1.5 h-14 rounded-2xl">
            <TabsTrigger value="all" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-black">All Activity</TabsTrigger>
            <TabsTrigger value="credits" className="flex-1 rounded-xl font-bold">Credits</TabsTrigger>
            <TabsTrigger value="debits" className="flex-1 rounded-xl font-bold">Debits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {txLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white/5 rounded-3xl shimmer" />
                ))}
              </div>
            ) : transactions?.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <p className="text-muted-foreground font-bold">No transactions found.</p>
              </div>
            ) : (
              transactions?.map((tx) => (
                <Card key={tx.id} className="bg-[#1A1A1A]/40 border-white/5 hover:bg-[#1A1A1A]/60 transition-colors rounded-3xl overflow-hidden group">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300",
                        (tx.type === 'deposit' || tx.type === 'prize') ? "bg-primary/10" : "bg-rose-500/10"
                      )}>
                        {(tx.type === 'deposit' || tx.type === 'prize') ? 
                          <ArrowDownLeft className={cn("w-6 h-6", getTypeStyle(tx.type))} /> : 
                          <ArrowUpRight className={cn("w-6 h-6", getTypeStyle(tx.type))} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold capitalize tracking-tight leading-none mb-1">{tx.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {tx.referenceId ? tx.referenceId : 'WALLET'} • {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-headline font-bold tracking-tight", getTypeStyle(tx.type))}>
                        {getSymbol(tx.type)}₹{tx.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70">
                        {getStatusIcon(tx.status)}
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">{tx.status}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}