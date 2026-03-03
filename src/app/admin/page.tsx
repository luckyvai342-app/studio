
"use client"

import { useState, useMemo } from 'react';
import { LayoutDashboard, CheckCircle, Clock, AlertTriangle, FileText, Send, Loader2, User, IndianRupee, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { generateMatchRecap } from '@/ai/flows/ai-powered-match-recap-generation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection } from '@/firebase';
import { collectionGroup, query, where, doc, runTransaction, serverTimestamp, orderBy, collection } from 'firebase/firestore';
import { approveWithdrawalAction } from '@/app/actions';

export default function AdminDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recapResult, setRecapResult] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingWithdrawalsQuery = useMemo(() => {
    return query(
      collectionGroup(db, 'transactions'),
      where('type', '==', 'withdrawal'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: withdrawals, loading } = useCollection<any>(pendingWithdrawalsQuery);

  const handleApproveWithdrawal = async (tx: any) => {
    if (!tx.userId || !tx.id) return;
    setProcessingId(tx.id);

    try {
      // Call secure server action to process Stripe transfer and Wallet deduction
      const result = await approveWithdrawalAction(tx.id, tx.userId, tx.amount);
      
      if (result.success) {
        toast({ 
          title: "Withdrawal Successful", 
          description: `₹${tx.amount} paid via Stripe. ID: ${result.transferId}` 
        });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Approval Failed", 
        description: error.message || "Something went wrong" 
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (tx: any) => {
    if (!tx.userId || !tx.id) return;
    setProcessingId(tx.id);

    try {
      const txRef = doc(db, 'users', tx.userId, 'transactions', tx.id);
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(txRef);
        if (!docSnap.exists()) throw new Error("Request not found");
        if (docSnap.data().status !== 'pending') throw new Error("Already processed");

        transaction.update(txRef, { 
          status: 'failed',
          updatedAt: serverTimestamp() 
        });
      });
      toast({ title: "Withdrawal Rejected", description: "The request has been marked as failed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateRecap = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMatchRecap({
        tournamentName: 'Apex Grand Finals',
        matchDate: new Date().toISOString().split('T')[0],
        players: [
          { username: 'GhostRider_FF', kills: 12, damageDealt: 2450, placement: 1 },
          { username: 'CyberSniper', kills: 8, damageDealt: 1800, placement: 2 },
          { username: 'Pro_Ninja', kills: 5, damageDealt: 1200, placement: 3 },
        ],
        significantMoments: [
          "GhostRider_FF secured a triple kill in the final circle.",
          "CyberSniper held the high ground in Clock Tower for 5 minutes.",
          "A massive bridge ambush caught three squads off guard."
        ]
      });
      setRecapResult(result.recapText);
      toast({ title: "AI Recap Generated", description: "Match summary is ready for review." });
    } catch (error) {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate recap." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-4 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
          <LayoutDashboard className="text-primary" /> Admin Control
        </h1>
        <p className="text-sm text-muted-foreground">Tournament management and financial approvals.</p>
      </header>

      <div className="space-y-6">
        <Card className="bg-card/40 border-white/5">
          <CardHeader className="p-4 border-b border-white/5">
            <CardTitle className="text-sm font-headline flex items-center justify-between">
              Pending Withdrawals 
              {withdrawals && withdrawals.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                  {withdrawals.length} REQUESTS
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : withdrawals?.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No pending payout requests found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {withdrawals?.map((tx: any) => (
                  <div key={tx.id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">₹{tx.amount.toLocaleString()}</p>
                        <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase">UID: {tx.userId?.substring(0, 8)}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-rose-500 hover:bg-rose-500/10 h-8"
                        disabled={!!processingId}
                        onClick={() => handleRejectWithdrawal(tx)}
                      >
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                        disabled={!!processingId}
                        onClick={() => handleApproveWithdrawal(tx)}
                      >
                        {processingId === tx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve & Pay'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/5 overflow-hidden">
          <CardHeader className="bg-primary/10 p-4">
            <CardTitle className="text-sm font-headline flex items-center gap-2">
              <FileText className="w-4 h-4" /> AI Match Recap
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">Automatically generate exciting tournament summaries based on match data.</p>
            
            {recapResult && (
              <div className="bg-background/80 p-4 rounded-xl text-sm border border-white/10 leading-relaxed max-h-48 overflow-y-auto mb-4">
                {recapResult}
              </div>
            )}

            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
              disabled={isGenerating}
              onClick={handleGenerateRecap}
            >
              {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : 'GENERATE APEX RECAP'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/5">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-headline">Report Match Result</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Input placeholder="Tournament ID" className="bg-background/50 border-white/10" />
            <Textarea placeholder="Winner Free Fire ID" className="bg-background/50 border-white/10" />
            <Button className="w-full bg-accent text-accent-foreground font-bold">
              SUBMIT WINNER DATA
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
