
"use client"

import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Trophy, Users, Wallet, ShieldAlert, History, 
  Settings, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Search, Plus, Eye, DollarSign, Ban, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { 
  collectionGroup, query, where, doc, updateDoc, 
  serverTimestamp, orderBy, collection, limit 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { approveWithdrawalAction } from '@/app/actions';
import { distributePrizesAction, refundTournamentAction } from '@/app/actions/admin-actions';

export default function AdminDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Queries
  const pendingWithdrawalsQuery = useMemo(() => {
    return query(
      collectionGroup(db, 'transactions'),
      where('type', '==', 'withdrawal'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const allTournamentsQuery = useMemo(() => {
    return query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(50));
  }, [db]);

  const recentLogsQuery = useMemo(() => {
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(20));
  }, [db]);

  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<any>(pendingWithdrawalsQuery);
  const { data: tournaments, loading: tournamentsLoading } = useCollection<any>(allTournamentsQuery);
  const { data: auditLogs, loading: logsLoading } = useCollection<any>(recentLogsQuery);

  const handleApproveWithdrawal = async (tx: any) => {
    setIsProcessing(tx.id);
    try {
      const result = await approveWithdrawalAction(tx.id, tx.userId, tx.amount);
      if (result.success) {
        toast({ title: "Approved", description: `₹${tx.amount} deducted from wallet.` });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDistributePrizes = async (tourneyId: string) => {
    // Mock result distribution for prototype
    setIsProcessing(tourneyId);
    try {
      // In a real scenario, you'd fetch participants first and allow ranking input
      const mockResults = [
        { userId: 'USER_MOCK_1', prize: 1000 },
        { userId: 'USER_MOCK_2', prize: 500 }
      ];
      await distributePrizesAction(tourneyId, authUser?.uid || 'system', mockResults);
      toast({ title: "Prizes Distributed", description: "Warriors have been paid." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-24">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111] sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-headline font-bold flex items-center gap-2">
            <ShieldAlert className="text-primary w-5 h-5" /> COMMAND CENTER
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Authorized Personnel Only</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-primary/20 text-primary">ADMIN: {authUser?.uid?.substring(0, 6)}</Badge>
          <Button variant="ghost" size="icon" className="rounded-xl"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="w-full px-6 mt-6" onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border-white/5 h-14 w-full justify-start p-1 rounded-2xl mb-8">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl px-6 font-bold flex gap-2">
            <LayoutDashboard className="w-4 h-4" /> STATS
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl px-6 font-bold flex gap-2">
            <Trophy className="w-4 h-4" /> BATTLES
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl px-6 font-bold flex gap-2">
            <Wallet className="w-4 h-4" /> PAYOUTS
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl px-6 font-bold flex gap-2">
            <History className="w-4 h-4" /> AUDIT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: '14,203', icon: Users, color: 'text-blue-400' },
              { label: 'Active Today', value: '1,842', icon: RefreshCw, color: 'text-emerald-400' },
              { label: 'Wallet Pool', value: '₹1.2M', icon: DollarSign, color: 'text-primary' },
              { label: 'Pending Payouts', value: withdrawals?.length || '0', icon: AlertTriangle, color: 'text-amber-500' },
            ].map((stat, i) => (
              <Card key={i} className="bg-white/5 border-white/5 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <stat.icon className={`w-5 h-5 mb-4 ${stat.color}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-headline font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-headline">High Priority Alerts</CardTitle>
              <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30">CRITICAL</Badge>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-8 text-center text-muted-foreground text-xs">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No high-risk activity detected in the last 24 hours.
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tournaments..." className="pl-12 bg-white/5 border-white/5 rounded-2xl h-12" />
            </div>
            <Button className="bg-primary text-black font-black rounded-2xl h-12 px-6 flex gap-2">
              <Plus className="w-4 h-4" /> NEW BATTLE
            </Button>
          </div>

          <div className="space-y-4">
            {tournamentsLoading ? <Loader2 className="animate-spin text-primary mx-auto" /> : 
              tournaments?.map((t: any) => (
                <Card key={t.id} className="bg-white/5 border-white/5 rounded-3xl overflow-hidden group">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                        {t.imageUrl && <img src={t.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{t.title}</h3>
                        <div className="flex gap-4 mt-1">
                          <Badge variant="outline" className="text-[9px] uppercase tracking-widest">{t.status}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                            <Users className="w-3 h-3" /> {t.joinedCount}/{t.maxPlayers}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="rounded-xl h-10 border border-white/5">Details</Button>
                      {t.status === 'open' && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="rounded-xl h-10 font-bold"
                          onClick={() => refundTournamentAction(t.id, authUser?.uid || 'admin')}
                        >
                          Cancel & Refund
                        </Button>
                      )}
                      {t.status === 'ongoing' && (
                        <Button 
                          size="sm" 
                          className="bg-primary text-black rounded-xl h-10 font-bold"
                          onClick={() => handleDistributePrizes(t.id)}
                          disabled={isProcessing === t.id}
                        >
                          {isProcessing === t.id ? <Loader2 className="animate-spin w-4 h-4" /> : 'Distribute Prizes'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            }
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-sm font-headline">Pending Payout Approvals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawalsLoading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div> : 
                withdrawals?.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-foreground">No pending requests. Great work!</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {withdrawals?.map((tx: any) => (
                      <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">₹{tx.amount}</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                              UID: {tx.userId?.substring(0, 10)} • {new Date(tx.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="ghost" className="text-rose-500 rounded-xl">Reject</Button>
                          <Button 
                            className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold px-6"
                            onClick={() => handleApproveWithdrawal(tx)}
                            disabled={isProcessing === tx.id}
                          >
                            {isProcessing === tx.id ? <Loader2 className="animate-spin w-4 h-4" /> : 'Approve & Deduct'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
           <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-sm font-headline">System Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {logsLoading ? <Loader2 className="animate-spin m-10 mx-auto" /> : 
                <div className="divide-y divide-white/5">
                  {auditLogs?.map((log: any) => (
                    <div key={log.id} className="p-4 flex items-center gap-4 text-[11px]">
                      <Badge variant="outline" className="border-white/10 uppercase text-[8px] tracking-widest shrink-0">
                        {new Date(log.timestamp?.toDate()).toLocaleTimeString()}
                      </Badge>
                      <span className="text-primary font-bold">ADMIN {log.adminId?.substring(0, 5)}</span>
                      <span className="text-muted-foreground">{log.action}:</span>
                      <span className="font-medium text-white">{log.details}</span>
                    </div>
                  ))}
                </div>
               }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
