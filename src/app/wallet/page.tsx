
"use client"

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getUserBalance, depositFundsAction, withdrawFundsAction } from '@/app/actions';
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
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-rose-500" />;
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
    <div className="flex flex-col min-h-screen animate-fade-in p-4 bg-background">
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-headline font-bold mb-1">My Wallet</h1>
        <p className="text-sm text-muted-foreground">Manage your funds and secure your winnings.</p>
      </header>

      <Card className="bg-gradient-to-br from-[#00FF88] to-[#00A3FF] border-none shadow-[0_10px_40px_rgba(0,255,136,0.2)] mb-8 overflow-hidden relative rounded-[2rem]">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Wallet className="w-32 h-32 text-black" />
        </div>
        <CardContent className="p-8">
          <p className="text-black/70 text-xs font-black uppercase tracking-widest mb-2">Available Balance</p>
          <h2 className="text-5xl font-headline font-bold text-black mb-8">
            ₹{balance !== null ? balance.toLocaleString() : '---'}
          </h2>
          <div className="flex gap-4">
            <Button className="flex-1 bg-black text-white hover:bg-black/80 font-black h-12 rounded-2xl shadow-lg" onClick={() => depositFundsAction(500)}>
              <Plus className="w-5 h-5 mr-2" /> Deposit
            </Button>
            <Button variant="outline" className="flex-1 border-black/20 bg-black/10 text-black hover:bg-black/20 font-black h-12 rounded-2xl" onClick={() => withdrawFundsAction(100)}>
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-headline font-bold">History</h3>
          <Badge variant="outline" className="border-white/5 text-muted-foreground uppercase font-black text-[10px]">Recent</Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-secondary/50 border border-white/5 mb-6 p-1 h-12 rounded-2xl">
            <TabsTrigger value="all" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-black">All</TabsTrigger>
            <TabsTrigger value="credits" className="flex-1 rounded-xl font-bold">Credits</TabsTrigger>
            <TabsTrigger value="debits" className="flex-1 rounded-xl font-bold">Debits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {MOCK_TRANSACTIONS.map((tx) => (
              <Card key={tx.id} className="bg-card/40 border-white/5 hover:bg-card/60 transition-colors rounded-2xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      (tx.type === 'deposit' || tx.type === 'prize') ? "bg-primary/10" : "bg-rose-500/10"
                    )}>
                      {(tx.type === 'deposit' || tx.type === 'prize') ? 
                        <ArrowDownLeft className={cn("w-6 h-6", getTypeStyle(tx.type))} /> : 
                        <ArrowUpRight className={cn("w-6 h-6", getTypeStyle(tx.type))} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-black capitalize tracking-tight">{tx.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                        {tx.referenceId ? tx.referenceId : 'System'} • {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-base font-black", getTypeStyle(tx.type))}>
                      {getSymbol(tx.type)}₹{tx.amount}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {getStatusIcon(tx.status)}
                      <span className="text-[10px] uppercase font-black text-muted-foreground">{tx.status}</span>
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
