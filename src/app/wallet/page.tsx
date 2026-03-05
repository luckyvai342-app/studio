
"use client"

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, CreditCard, ChevronLeft, Loader2, IndianRupee, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, addDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const MIN_WITHDRAWAL_AMOUNT = 100;

export default function WalletPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [isProcessing, setIsProcessing] = useState(false);

  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: userProfile, loading: userLoading } = useDoc<any>(userProfileRef);

  const transactionsQuery = useMemo(() => {
    if (!authUser) return null;
    return query(
      collection(db, 'users', authUser.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, authUser]);

  const { data: transactions, loading: txLoading } = useCollection<any>(transactionsQuery);

  const handleDeposit = async () => {
    if (!authUser || !depositAmount) return;
    const amountNum = parseInt(depositAmount);
    if (isNaN(amountNum) || amountNum < 100) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Minimum deposit is ₹100" });
      return;
    }

    setIsProcessing(true);
    try {
      /**
       * RAZORPAY INTEGRATION STEP:
       * Instead of Stripe Checkout, you will:
       * 1. Call your backend to create a Razorpay Order.
       * 2. Initialize Razorpay Checkout on the client.
       * 3. Handle the payment success callback.
       */
      
      await addDoc(collection(db, 'users', authUser.uid, 'transactions'), {
        userId: authUser.uid,
        amount: amountNum,
        type: 'deposit',
        status: 'pending',
        createdAt: new Date().toISOString(),
        referenceId: 'razorpay_pending_placeholder'
      });

      toast({
        title: "Deposit Initiated",
        description: "Razorpay integration is pending. This is a placeholder for the payment gateway.",
      });
      
      setIsDepositOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deposit Error",
        description: error.message || "Failed to initiate deposit",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!authUser || !userProfileRef) return;
    const amountNum = parseInt(withdrawAmount);

    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL_AMOUNT) {
      toast({ 
        variant: "destructive", 
        title: "Invalid Amount", 
        description: `Minimum withdrawal is ₹${MIN_WITHDRAWAL_AMOUNT}` 
      });
      return;
    }

    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userProfileRef);
        if (!userDoc.exists()) throw new Error("User profile not found");
        
        const currentBalance = userDoc.data().walletBalance || 0;
        if (currentBalance < amountNum) {
          throw new Error("Insufficient wallet balance for this withdrawal");
        }

        const txRef = doc(collection(db, 'users', authUser.uid, 'transactions'));
        transaction.set(txRef, {
          userId: authUser.uid,
          amount: amountNum,
          type: 'withdrawal',
          status: 'pending',
          createdAt: new Date().toISOString(),
          referenceId: 'user_request'
        });

        const auditRef = doc(collection(db, 'audit_logs'));
        transaction.set(auditRef, {
          userId: authUser.uid,
          action: 'WITHDRAWAL_REQUESTED',
          details: `Requested withdrawal of ₹${amountNum}`,
          severity: 'info',
          timestamp: serverTimestamp()
        });
      });

      setIsWithdrawOpen(false);
      toast({ 
        title: "Request Submitted", 
        description: "Your withdrawal is pending admin approval." 
      });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: userProfileRef.path,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: "destructive",
          title: "Withdrawal Failed",
          description: error.message || "Something went wrong",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-primary" />;
      case 'pending': return <Clock className="w-3 h-3 text-amber-500" />;
      case 'failed': return <XCircle className="w-3 h-3 text-rose-500" />;
      default: return null;
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
            <Button 
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 bg-black text-white hover:bg-black/90 font-black h-16 rounded-3xl shadow-2xl transition-transform active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" /> TOP UP
            </Button>
            <Button 
              onClick={() => setIsWithdrawOpen(true)}
              variant="outline" 
              className="flex-1 border-black/20 bg-black/10 text-black hover:bg-black/20 font-black h-16 rounded-3xl transition-transform active:scale-95"
            >
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
              transactions?.map((tx: any) => (
                <Card key={tx.id} className="bg-[#1A1A1A]/40 border-white/5 hover:bg-[#1A1A1A]/60 transition-colors rounded-3xl overflow-hidden group">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300",
                        (tx.type === 'deposit' || tx.type === 'prize') ? "bg-primary/10" : "bg-rose-500/10"
                      )}>
                        {(tx.type === 'deposit' || tx.type === 'prize') ? 
                          <ArrowDownLeft className={cn("w-6 h-6", (tx.type === 'deposit' || tx.type === 'prize') ? 'text-primary' : 'text-rose-500')} /> : 
                          <ArrowUpRight className={cn("w-6 h-6", (tx.type === 'deposit' || tx.type === 'prize') ? 'text-primary' : 'text-rose-500')} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold capitalize tracking-tight leading-none mb-1">{tx.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {tx.referenceId?.substring(0, 10) || 'WALLET'} • {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-headline font-bold tracking-tight", (tx.type === 'deposit' || tx.type === 'prize') ? 'text-primary' : 'text-rose-500')}>
                        {(tx.type === 'deposit' || tx.type === 'prize') ? '+' : '-'}₹{tx.amount.toLocaleString()}
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

      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[2.5rem] max-w-[90%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold text-center">Top Up Credits</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Add funds to your battle wallet via Razorpay secure gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex justify-center gap-2">
              {['100', '500', '1000'].map((amt) => (
                <Button 
                  key={amt}
                  variant={depositAmount === amt ? 'default' : 'outline'}
                  onClick={() => setDepositAmount(amt)}
                  className={cn(
                    "rounded-2xl h-12 px-6 font-bold transition-all",
                    depositAmount === amt ? "bg-primary text-black" : "border-white/10 hover:border-primary/50"
                  )}
                >
                  ₹{amt}
                </Button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
              <Input 
                type="number" 
                value={depositAmount} 
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="bg-background/50 border-white/10 h-16 pl-10 rounded-2xl text-xl font-bold focus:border-primary"
              />
            </div>

            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Total to pay:</span>
              <span className="text-xl font-headline font-bold text-primary">₹{depositAmount || '0'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-primary text-black font-black text-lg shadow-lg shadow-primary/20"
              disabled={isProcessing || !depositAmount}
              onClick={handleDeposit}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'ADD CREDITS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[2.5rem] max-w-[90%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold text-center">Request Payout</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Transfer your winnings to your linked bank account or UPI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-background/40 p-6 rounded-3xl border border-white/5 text-center">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">Maximum Withdrawable</p>
              <p className="text-3xl font-headline font-bold text-[#00E0FF]">₹{userProfile?.walletBalance?.toLocaleString() ?? '0'}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Enter Amount (Min ₹100)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                <Input 
                  type="number" 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-background/50 border-white/10 h-16 pl-10 rounded-2xl text-xl font-bold focus:border-primary"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex gap-3">
              <Landmark className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight leading-relaxed">
                Payouts are processed manually within 24-48 hours. Ensure your profile details are correct.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-[#00E0FF] text-black font-black text-lg shadow-lg shadow-[#00E0FF]/20"
              disabled={isProcessing || !withdrawAmount || parseInt(withdrawAmount) < MIN_WITHDRAWAL_AMOUNT || (userProfile?.walletBalance < parseInt(withdrawAmount))}
              onClick={handleRequestWithdrawal}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'SUBMIT PAYOUT REQUEST'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
