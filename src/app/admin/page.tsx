
"use client"

import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Trophy, Users, Wallet, ShieldAlert, History, 
  Settings, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Search, Plus, Eye, DollarSign, Ban, RefreshCw, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { 
  collectionGroup, query, where, doc, updateDoc, 
  serverTimestamp, orderBy, collection, limit 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { approveWithdrawalAction } from '@/app/actions';
import { distributePrizesAction, refundTournamentAction, createTournamentAction } from '@/app/actions/admin-actions';

export default function AdminDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // New Tournament Form State
  const [newTournament, setNewTournament] = useState({
    title: '',
    description: '',
    entryFee: 50,
    totalPrize: 1000,
    maxPlayers: 48,
    map: 'Bermuda',
    type: 'Solo',
    startTime: new Date().toISOString().slice(0, 16),
    imageUrl: 'https://picsum.photos/seed/tourney/400/250'
  });

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

  const handleCreateTournament = async () => {
    if (!newTournament.title || !authUser) return;
    setIsProcessing('creating');
    try {
      await createTournamentAction(authUser.uid, newTournament);
      toast({ title: "Battle Deployed", description: `${newTournament.title} is now live.` });
      setIsCreateDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deployment Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

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
    setIsProcessing(tourneyId);
    try {
      const mockResults = [{ userId: 'system', prize: 0 }]; // Logic placeholder
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
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tournaments..." className="pl-12 bg-white/5 border-white/5 rounded-2xl h-12" />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-black font-black rounded-2xl h-12 px-6 flex gap-2">
                  <Plus className="w-4 h-4" /> NEW BATTLE
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[2.5rem] max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-headline font-bold">Deploy New Battle</DialogTitle>
                  <DialogDescription>Configure match parameters for the arena.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Match Title</Label>
                    <Input value={newTournament.title} onChange={e => setNewTournament({...newTournament, title: e.target.value})} className="bg-background/50 border-white/10" placeholder="e.g. Sunday Super Cup" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Entry Fee (₹)</Label>
                    <Input type="number" value={newTournament.entryFee} onChange={e => setNewTournament({...newTournament, entryFee: parseInt(e.target.value)})} className="bg-background/50 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Prize Pool (₹)</Label>
                    <Input type="number" value={newTournament.totalPrize} onChange={e => setNewTournament({...newTournament, totalPrize: parseInt(e.target.value)})} className="bg-background/50 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Max Players</Label>
                    <Input type="number" value={newTournament.maxPlayers} onChange={e => setNewTournament({...newTournament, maxPlayers: parseInt(e.target.value)})} className="bg-background/50 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Map</Label>
                    <Select value={newTournament.map} onValueChange={v => setNewTournament({...newTournament, map: v})}>
                      <SelectTrigger className="bg-background/50 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bermuda">Bermuda</SelectItem>
                        <SelectItem value="Purgatory">Purgatory</SelectItem>
                        <SelectItem value="Kalahari">Kalahari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full bg-primary text-black font-black rounded-xl h-12" onClick={handleCreateTournament} disabled={isProcessing === 'creating'}>
                    {isProcessing === 'creating' ? <Loader2 className="animate-spin" /> : 'DEPLOY TOURNAMENT'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                              UID: {tx.userId?.substring(0, 10)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
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
