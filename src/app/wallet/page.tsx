
"use client"

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getUserBalance, depositFundsAction, withdrawFundsAction } from '@/app/actions';
import { Transaction } from '@/app/lib/types';

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
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const getTypeStyle = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': case 'prize': return 'text-emerald-500';
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
    <div className="flex flex-col min-h-screen animate-fade-in p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-headline font-bold mb-1">My Wallet</h1>
        <p className="text-sm text-muted-foreground">Manage your funds and winnings securely.</p>
      </header>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary to-accent border-none shadow-xl shadow-primary/20 mb-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32 text-white" />
        </div>
        <CardContent className="p-8">
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">Available Balance</p>
          <h2 className="text-4xl font-headline font-bold text-white mb-6">
            ₹{balance !== null ? balance.toLocaleString() : '---'}
          </h2>
          <div className="flex gap-3">
            <Button className="flex-1 bg-white text-primary hover:bg-white/90 font-bold" onClick={() => depositFundsAction(500)}>
              <Plus className="w-4 h-4 mr-2" /> Deposit
            </Button>
            <Button variant="outline" className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold" onClick={() => withdrawFundsAction(100)}>
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-headline font-bold">Transaction History</h3>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-card/40 border border-white/5 mb-4">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="credits" className="flex-1">Credits</TabsTrigger>
            <TabsTrigger value="debits" className="flex-1">Debits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-3">
            {MOCK_TRANSACTIONS.map((tx) => (
              <Card key={tx.id} className="bg-card/40 border-white/5 hover:bg-card/60 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      (tx.type === 'deposit' || tx.type === 'prize') ? "bg-emerald-500/10" : "bg-rose-500/10"
                    )}>
                      {(tx.type === 'deposit' || tx.type === 'prize') ? 
                        <ArrowDownLeft className={cn("w-5 h-5", getTypeStyle(tx.type))} /> : 
                        <ArrowUpRight className={cn("w-5 h-5", getTypeStyle(tx.type))} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {tx.referenceId ? tx.referenceId : 'System'} • {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", getTypeStyle(tx.type))}>
                      {getSymbol(tx.type)}₹{tx.amount}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {getStatusIcon(tx.status)}
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{tx.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="credits">
            {/* Filtered list simulation */}
          </TabsContent>
          <TabsContent value="debits">
            {/* Filtered list simulation */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
