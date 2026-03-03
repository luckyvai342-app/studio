
"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, CreditCard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getUserBalance, depositFundsAction } from '@/app/actions';
import { Transaction } from '@/app/lib/types';
import { cn } from '@/lib/utils';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx1', userId: 'u1', amount: 50, type: 'entry_fee', status: 'completed', createdAt: '2024-05-15T10:00:00Z', referenceId: 'Apex Grand Finals' },
  { id: 'tx2', userId: 'u1', amount: 1000, type: 'prize', status: 'completed', createdAt: '2024-05-14T22:30:00Z', referenceId: 'Midnight Blitz' },
  { id: 'tx3', userId: 'u1', amount: 500, type: 'deposit', status: 'completed', createdAt: '2024-05-14T08:00:00Z' },
  { id: 'tx4', userId: 'u1', amount: 200, type: 'withdrawal', status: 'pending', createdAt: '2024-05-13T14:20:00Z' },
];

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    getUserBalance().then(setBalance);
  }, []);

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-primary" />;
      case 'pending': return <Clock className="w-3 h-3 text-amber-500" />;
      case 'failed': return <XCircle className="w-3 h-3 text-rose-500" />;
    }
  };

  const getTypeStyle = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': case 'prize': return 'text-primary';
      case 'withdrawal': case 'entry_fee': return 'text-rose-500';
    }
  };

  const getSymbol = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': case 'prize': return '+';
      case 'withdrawal': case 'entry_fee': return '-';
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-in-fade bg-[#0D0D0D] p-4 pb-24">
      <header className="flex items-center justify-between mb-8 mt-4">
        <Link href="/" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-headline font-bold tracking-tight">Finances</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Modern Card Display */}
      <Card className="bg-gradient-to-br from-[#00FF88] to-[#00A3FF] border-none shadow-[0_20px_50px_rgba(0,255,136,0.3)] mb-10 overflow-hidden relative rounded-[2.5rem] h-60">
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <CreditCard className="w-64 h-64 text-black" />
        </div>
        <CardContent className="p-10 flex flex-col justify-between h-full relative z-10">
          <div>
            <p className="text-black/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Available Credits</p>
            <h2 className="text-5xl font-headline font-bold text-black tracking-tighter">
              ₹{balance !== null ? balance.toLocaleString() : '---'}
            </h2>
          </div>
          <div className="flex gap-4">
            <Button className="flex-1 bg-black text-white hover:bg-black/90 font-black h-14 rounded-2xl shadow-2xl" onClick={() => depositFundsAction(500)}>
              <Plus className="w-5 h-5 mr-2" /> ADD CASH
            </Button>
            <Button variant="outline" className="flex-1 border-black/20 bg-black/10 text-black hover:bg-black/20 font-black h-14 rounded-2xl">
              WITHDRAW
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-xl font-headline font-bold tracking-tight">Transaction logs</h3>
          <Badge variant="outline" className="border-white/5 text-muted-foreground uppercase font-black text-[9px] tracking-widest px-3 py-1 rounded-full">HISTORY</Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-[#1A1A1A] border border-white/5 mb-8 p-1.5 h-14 rounded-2xl">
            <TabsTrigger value="all" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-black">All</TabsTrigger>
            <TabsTrigger value="credits" className="flex-1 rounded-xl font-bold">Credits</TabsTrigger>
            <TabsTrigger value="debits" className="flex-1 rounded-xl font-bold">Debits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {MOCK_TRANSACTIONS.map((tx) => (
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
                      {getSymbol(tx.type)}₹{tx.amount}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70">
                      {getStatusIcon(tx.status)}
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">{tx.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
