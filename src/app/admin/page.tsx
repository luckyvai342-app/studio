
"use client"

import { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Trophy, Users, Wallet, ShieldAlert, History, 
  Settings, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Search, Plus, Eye, DollarSign, Ban, RefreshCw, Save, Upload, Zap,
  Menu, X, ChevronRight, BarChart3, MessageSquare, Camera, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useUser, useDoc } from '@/firebase';
import { 
  collectionGroup, query, where, doc, updateDoc, 
  serverTimestamp, orderBy, collection, limit, getDocs 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { approveWithdrawalAction } from '@/app/actions';
import { 
  distributePrizesAction, 
  createTournamentAction, 
  distributeRoomDetailsAction,
  adjustUserWalletAction,
  toggleUserStatusAction
} from '@/app/actions/admin-actions';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type AdminSection = 'dashboard' | 'users' | 'tournaments' | 'wallet' | 'withdrawals' | 'rooms' | 'leaderboard' | 'reports' | 'settings';

export default function AdminDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Real-time admin verification
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: adminProfile } = useDoc<any>(userProfileRef);

  // Search States
  const [userSearch, setUserSearch] = useState('');
  const [tourneySearch, setTourneySearch] = useState('');

  // Modals States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeUserAdjust, setActiveUserAdjust] = useState<any>(null);
  const [adjAmount, setAdjAmount] = useState('0');
  const [roomDistTourney, setRoomDistTourney] = useState<any>(null);
  const [roomDetails, setRoomDetails] = useState({ roomId: '', password: '' });
  const [activeResultsTourney, setActiveResultsTourney] = useState<any>(null);
  const [playerResults, setPlayerResults] = useState<any[]>([]);

  // Queries
  const statsQuery = useMemo(() => query(collection(db, 'users'), limit(1)), [db]); // Just for triggering reactive counts if needed
  const pendingWithdrawalsQuery = useMemo(() => query(collectionGroup(db, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), [db]);
  const allTournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(50)), [db]);
  const allUsersQuery = useMemo(() => query(collection(db, 'users'), limit(100)), [db]);
  const auditLogsQuery = useMemo(() => query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50)), [db]);
  const paymentOrdersQuery = useMemo(() => query(collection(db, 'paymentOrders'), orderBy('createdAt', 'desc'), limit(50)), [db]);

  const { data: withdrawals } = useCollection<any>(pendingWithdrawalsQuery);
  const { data: tournaments, loading: tourneyLoading } = useCollection<any>(allTournamentsQuery);
  const { data: users, loading: usersLoading } = useCollection<any>(allUsersQuery);
  const { data: auditLogs } = useCollection<any>(auditLogsQuery);
  const { data: paymentOrders } = useCollection<any>(paymentOrdersQuery);

  // Security Check
  if (adminProfile && adminProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only authorized administrators can access the Command Center.</p>
        <Button className="mt-6" onClick={() => window.location.href = '/'}>Return to Arena</Button>
      </div>
    );
  }

  const handleAdjustWallet = async () => {
    if (!activeUserAdjust || !authUser) return;
    setIsProcessing('adjusting');
    try {
      await adjustUserWalletAction(authUser.uid, activeUserAdjust.uid, parseInt(adjAmount), "Admin Manual Adjustment");
      toast({ title: "Wallet Adjusted", description: `Updated ${activeUserAdjust.username}'s balance.` });
      setActiveUserAdjust(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Adjustment Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleStatus = async (user: any, status: any) => {
    if (!authUser) return;
    setIsProcessing(user.uid);
    try {
      await toggleUserStatusAction(authUser.uid, user.uid, status);
      toast({ title: "Status Updated", description: `${user.username} is now ${status}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDistributeRoom = async () => {
    if (!roomDistTourney || !authUser || !roomDetails.roomId) return;
    setIsProcessing('distributing');
    try {
      await distributeRoomDetailsAction(roomDistTourney.id, authUser.uid, roomDetails.roomId, roomDetails.password);
      toast({ title: "Intelligence Broadcasted", description: "Warriors notified." });
      setRoomDistTourney(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'wallet', label: 'Wallet Logs', icon: Wallet },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign, badge: withdrawals?.length },
    { id: 'rooms', label: 'Room Management', icon: Zap },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'reports', label: 'Security Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#111] border-r border-white/5 transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="text-black w-5 h-5" />
            </div>
            {isSidebarOpen && <span className="font-headline font-bold tracking-tighter">X-COMMAND</span>}
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as AdminSection)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                  activeSection === item.id ? "bg-primary text-black" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", activeSection === item.id ? "text-black" : "group-hover:text-primary")} />
                {isSidebarOpen && (
                  <span className="flex-1 text-left font-bold text-xs uppercase tracking-widest">{item.label}</span>
                )}
                {isSidebarOpen && item.badge && (
                  <Badge className="bg-rose-500 text-white border-none text-[8px] px-1.5">{item.badge}</Badge>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
             <Button variant="ghost" className="w-full justify-start gap-4 text-rose-500 hover:bg-rose-500/10" onClick={() => window.location.href = '/'}>
                <XCircle className="w-5 h-5" />
                {isSidebarOpen && <span className="text-xs font-black uppercase tracking-widest">Exit Panel</span>}
             </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0D0D0D]/50 backdrop-blur-xl sticky top-0 z-40">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu className="w-5 h-5" /></Button>
             <h2 className="text-sm font-headline font-bold uppercase tracking-[0.2em] text-muted-foreground">{activeSection}</h2>
           </div>
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                 <p className="text-xs font-bold leading-none">{adminProfile?.username}</p>
                 <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Super Admin</p>
               </div>
               <div className="w-10 h-10 bg-white/5 rounded-2xl border border-white/10" />
             </div>
           </div>
        </header>

        <ScrollArea className="flex-1 p-8">
           {/* Section: Dashboard */}
           {activeSection === 'dashboard' && (
             <div className="space-y-8 animate-in-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Revenue', value: '₹4.2M', icon: DollarSign, trend: '+12%', color: 'text-primary' },
                    { label: 'Active Users', value: '14,203', icon: Users, trend: '+3%', color: 'text-blue-400' },
                    { label: 'Live Battles', value: tournaments?.filter((t:any) => t.status === 'ongoing').length || '0', icon: Trophy, color: 'text-amber-500' },
                    { label: 'Withdrawal Vol', value: '₹120K', icon: Wallet, color: 'text-rose-500' },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-[#111] border-white/5 rounded-[2rem] overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                           <div className={cn("p-3 rounded-2xl bg-white/5", stat.color)}><stat.icon className="w-5 h-5" /></div>
                           {stat.trend && <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-[10px]">{stat.trend}</Badge>}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-headline font-bold mt-1">{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <Card className="lg:col-span-2 bg-[#111] border-white/5 rounded-[2.5rem]">
                      <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="text-sm font-headline">Operational Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y divide-white/5">
                            {auditLogs?.map((log: any) => (
                              <div key={log.id} className="p-6 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                 <Badge variant="outline" className="text-[9px] uppercase tracking-tighter shrink-0 border-white/10 font-black">
                                   {log.timestamp?.toDate().toLocaleTimeString()}
                                 </Badge>
                                 <div className="flex-1">
                                    <p className="text-xs font-bold">{log.details}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Target ID: {log.targetId?.substring(0, 10)}</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="bg-[#111] border-white/5 rounded-[2.5rem]">
                      <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="text-sm font-headline">Pending Tasks</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
                         {[
                           { label: 'Payout Requests', count: withdrawals?.length || 0, color: 'bg-rose-500' },
                           { label: 'Room Broadcasts', count: tournaments?.filter((t:any) => t.status === 'ongoing' && !t.roomDistributed).length || 0, color: 'bg-amber-500' },
                           { label: 'Pending Results', count: tournaments?.filter((t:any) => t.status === 'ongoing').length || 0, color: 'bg-blue-500' },
                         ].map((task, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                              <span className="text-xs font-bold uppercase tracking-widest">{task.label}</span>
                              <Badge className={cn("text-white border-none", task.color)}>{task.count}</Badge>
                           </div>
                         ))}
                      </CardContent>
                   </Card>
                </div>
             </div>
           )}

           {/* Section: Users */}
           {activeSection === 'users' && (
             <div className="space-y-6 animate-in-fade">
                <div className="flex justify-between items-center bg-[#111] p-6 rounded-[2rem] border border-white/5">
                   <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search warriors by UID or Name..." 
                        className="bg-white/5 border-white/5 pl-12 h-12 rounded-2xl" 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                   </div>
                   <Button className="bg-primary text-black font-black rounded-2xl h-12 px-6 flex gap-2">
                      <Filter className="w-4 h-4" /> FILTERS
                   </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {users?.filter((u:any) => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.gameUid?.includes(userSearch)).map((user: any) => (
                     <Card key={user.uid} className="bg-[#111] border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all">
                        <CardContent className="p-6">
                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-14 h-14 bg-white/5 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform" />
                              <div className="flex-1">
                                 <h3 className="font-bold text-lg">{user.username}</h3>
                                 <Badge variant="outline" className="text-[9px] uppercase tracking-widest mt-1 border-white/10 text-muted-foreground">{user.status}</Badge>
                              </div>
                              <div className="text-right">
                                 <p className="text-xs font-black text-primary">₹{user.walletBalance?.toLocaleString()}</p>
                                 <p className="text-[9px] text-muted-foreground uppercase tracking-tighter mt-1">WALLET</p>
                              </div>
                           </div>
                           
                           <div className="space-y-2 mb-6 text-[11px] font-medium text-muted-foreground">
                              <div className="flex justify-between"><span>Game UID:</span> <span className="text-white">{user.gameUid || '---'}</span></div>
                              <div className="flex justify-between"><span>Region:</span> <span className="text-white">{user.gameRegion || '---'}</span></div>
                              <div className="flex justify-between"><span>Joined:</span> <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span></div>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                              <Button variant="secondary" size="sm" className="rounded-xl font-bold h-10" onClick={() => setActiveUserAdjust(user)}>ADJUST</Button>
                              <Select onValueChange={(v) => handleToggleStatus(user, v)} defaultValue={user.status}>
                                <SelectTrigger className="rounded-xl h-10 bg-white/5 border-white/5 text-[10px] font-black uppercase">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-white/10">
                                  <SelectItem value="active">ACTIVE</SelectItem>
                                  <SelectItem value="suspended">SUSPEND</SelectItem>
                                  <SelectItem value="banned">BAN</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>
                        </CardContent>
                     </Card>
                   ))}
                </div>
             </div>
           )}

           {/* User Adjustment Dialog */}
           <Dialog open={!!activeUserAdjust} onOpenChange={() => setActiveUserAdjust(null)}>
              <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[2.5rem] max-w-sm">
                 <DialogHeader>
                    <DialogTitle className="text-xl font-headline">Adjust Balance: {activeUserAdjust?.username}</DialogTitle>
                    <DialogDescription>Modify user wallet. Use negative numbers for deduction.</DialogDescription>
                 </DialogHeader>
                 <div className="py-6 space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold uppercase text-muted-foreground">Adjustment Amount (₹)</Label>
                       <Input 
                        type="number" 
                        value={adjAmount} 
                        onChange={e => setAdjAmount(e.target.value)} 
                        className="bg-background/50 border-white/10 h-14 text-2xl font-bold"
                       />
                    </div>
                 </div>
                 <DialogFooter>
                    <Button className="w-full h-14 bg-primary text-black font-black rounded-xl" onClick={handleAdjustWallet} disabled={isProcessing === 'adjusting'}>
                       {isProcessing === 'adjusting' ? <Loader2 className="animate-spin" /> : 'APPLY ADJUSTMENT'}
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>

           {/* Section: Rooms */}
           {activeSection === 'rooms' && (
             <div className="space-y-6 animate-in-fade">
                <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/20 flex items-center justify-between">
                   <div>
                      <h3 className="text-2xl font-headline font-bold text-primary">Intelligence Hub</h3>
                      <p className="text-muted-foreground text-sm mt-1">Broadcasting battle credentials to registered warriors.</p>
                   </div>
                   <Zap className="w-12 h-12 text-primary opacity-20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {tournaments?.filter((t:any) => t.status === 'ongoing' || t.status === 'full').map((t: any) => (
                     <Card key={t.id} className={cn(
                       "bg-[#111] border-white/5 rounded-[2rem] overflow-hidden transition-all",
                       t.roomDistributed && "opacity-60 border-emerald-500/20"
                     )}>
                        <CardContent className="p-8">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <h4 className="font-bold text-lg">{t.title}</h4>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">STATUS: {t.status}</p>
                              </div>
                              {t.roomDistributed && <Badge className="bg-emerald-500/10 text-emerald-500 border-none">SENT</Badge>}
                           </div>
                           
                           <div className="space-y-4 mb-8">
                              <div className="space-y-2">
                                 <Label className="text-[8px] font-bold uppercase text-muted-foreground">Target Room ID</Label>
                                 <Input 
                                  placeholder="5293..." 
                                  value={t.roomId || ''} 
                                  disabled={t.roomDistributed} 
                                  className="bg-background/50 border-white/5 h-12"
                                  onChange={e => {
                                    // Local state update would be better but for prototype we use simple distribution modal
                                  }}
                                 />
                              </div>
                           </div>

                           <Button 
                            className="w-full bg-primary text-black font-black h-12 rounded-xl"
                            onClick={() => setRoomDistTourney(t)}
                            disabled={t.roomDistributed}
                           >
                              {t.roomDistributed ? 'CREDENTIALS DISPATCHED' : 'DISPATCH ROOM DETAILS'}
                           </Button>
                        </CardContent>
                     </Card>
                   ))}
                </div>
             </div>
           )}

           {/* Section: Withdrawals */}
           {activeSection === 'withdrawals' && (
             <div className="space-y-6 animate-in-fade">
                <Card className="bg-[#111] border-white/5 rounded-[2.5rem] overflow-hidden">
                   <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-headline">Pending Payout Requests</CardTitle>
                      <Badge className="bg-rose-500/10 text-rose-500 border-none">{withdrawals?.length || 0} TOTAL</Badge>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y divide-white/5">
                         {withdrawals?.map((tx: any) => (
                           <div key={tx.id} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-6">
                                 <div className="p-4 bg-rose-500/10 rounded-[1.5rem] text-rose-500">
                                    <ArrowUpRight className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <p className="text-2xl font-headline font-bold">₹{tx.amount}</p>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Warrior ID: {tx.userId?.substring(0, 10)}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <Button variant="ghost" className="rounded-xl h-12 px-6 font-bold">REJECT</Button>
                                 <Button className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl h-12 px-8 font-black" onClick={() => approveWithdrawalAction(tx.id, tx.userId, tx.amount)}>
                                    APPROVE & PAY
                                 </Button>
                              </div>
                           </div>
                         ))}
                         {withdrawals?.length === 0 && (
                           <div className="p-20 text-center">
                              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4 opacity-20" />
                              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">All warriors paid</p>
                           </div>
                         )}
                      </div>
                   </CardContent>
                </Card>
             </div>
           )}

           {/* Section: Settings (Placeholder for Rule Config) */}
           {activeSection === 'settings' && (
             <div className="space-y-8 animate-in-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <Card className="bg-[#111] border-white/5 rounded-[2.5rem]">
                      <CardHeader className="p-8 border-b border-white/5"><CardTitle className="text-sm font-headline">Platform Parameters</CardTitle></CardHeader>
                      <CardContent className="p-8 space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min Withdrawal Limit (₹)</Label>
                            <Input defaultValue="100" className="bg-background/50 border-white/10" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Platform Commission (%)</Label>
                            <Input defaultValue="20" className="bg-background/50 border-white/10" />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div>
                               <p className="text-xs font-bold uppercase">Maintenance Mode</p>
                               <p className="text-[10px] text-muted-foreground mt-1">Prevent all registrations and match joining</p>
                            </div>
                            <Button variant="outline" className="rounded-xl text-[10px] font-black uppercase border-rose-500/20 text-rose-500">Enable</Button>
                         </div>
                         <Button className="w-full h-12 bg-primary text-black font-black rounded-xl mt-4">SAVE SYSTEM CONFIG</Button>
                      </CardContent>
                   </Card>
                </div>
             </div>
           )}
        </ScrollArea>
      </main>

      {/* Reusable Room Distribution Dialog */}
      <Dialog open={!!roomDistTourney} onOpenChange={() => setRoomDistTourney(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[2.5rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline font-bold text-primary">Intelligence Dispatch</DialogTitle>
            <DialogDescription>Distribute battle credentials to all participants of {roomDistTourney?.title}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Room ID</Label>
              <Input value={roomDetails.roomId} onChange={e => setRoomDetails({...roomDetails, roomId: e.target.value})} placeholder="e.g. 5293810" className="bg-background/50 border-white/10 h-12" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Password</Label>
              <Input value={roomDetails.password} onChange={e => setRoomDetails({...roomDetails, password: e.target.value})} placeholder="e.g. 1234" className="bg-background/50 border-white/10 h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-primary text-black font-black rounded-xl h-14 shadow-lg shadow-primary/20" onClick={handleDistributeRoom} disabled={isProcessing === 'distributing'}>
              {isProcessing === 'distributing' ? <Loader2 className="animate-spin" /> : 'BRDCST & GO LIVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
