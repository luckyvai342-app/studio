
"use client"

import { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Trophy, Users, Wallet, ShieldAlert, History, 
  Settings, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Search, Plus, Eye, DollarSign, Ban, RefreshCw, Save, Upload, Zap,
  Menu, X, ChevronRight, BarChart3, MessageSquare, Camera, Filter, ArrowUpRight, Trash2, Edit3, Calendar
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
  serverTimestamp, orderBy, collection, limit, getDocs, deleteDoc 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { approveWithdrawalAction } from '@/app/actions';
import { 
  distributePrizesAction, 
  createTournamentAction, 
  distributeRoomDetailsAction,
  adjustUserWalletAction,
  toggleUserStatusAction,
  cancelTournamentAction
} from '@/app/actions/admin-actions';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

type AdminSection = 'dashboard' | 'users' | 'tournaments' | 'wallet' | 'withdrawals' | 'rooms' | 'reports' | 'settings';

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
  const [newTourney, setNewTourney] = useState({
    title: '',
    description: '',
    entryFee: 50,
    totalPrize: 1000,
    maxPlayers: 48,
    map: 'Bermuda',
    type: 'Solo',
    startTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    imageUrl: 'https://picsum.photos/seed/ffmatch/800/400'
  });

  const [activeUserAdjust, setActiveUserAdjust] = useState<any>(null);
  const [adjAmount, setAdjAmount] = useState('0');
  const [roomDistTourney, setRoomDistTourney] = useState<any>(null);
  const [roomDetails, setRoomDetails] = useState({ roomId: '', password: '' });

  // Queries
  const pendingWithdrawalsQuery = useMemo(() => query(collectionGroup(db, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), [db]);
  const allTournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(50)), [db]);
  const allUsersQuery = useMemo(() => query(collection(db, 'users'), limit(100)), [db]);
  const auditLogsQuery = useMemo(() => query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50)), [db]);

  const { data: withdrawals } = useCollection<any>(pendingWithdrawalsQuery);
  const { data: tournaments } = useCollection<any>(allTournamentsQuery);
  const { data: users } = useCollection<any>(allUsersQuery);
  const { data: auditLogs } = useCollection<any>(auditLogsQuery);

  // Security Check
  if (adminProfile && adminProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0D0D0D]">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only authorized administrators can access the Command Center.</p>
        <Button className="mt-6 bg-primary text-black font-bold" onClick={() => window.location.href = '/'}>Return to Arena</Button>
      </div>
    );
  }

  const handleCreateTournament = async () => {
    if (!authUser) return;
    setIsProcessing('creating');
    try {
      await createTournamentAction(authUser.uid, newTourney);
      toast({ title: "Tournament Deployed", description: "Warriors can now join the arena." });
      setIsCreateDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelTournament = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure? This will refund all players immediately.")) return;
    setIsProcessing(id);
    try {
      await cancelTournamentAction(id, authUser.uid);
      toast({ title: "Tournament Cancelled", description: "All entry fees have been refunded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Refund Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteTournament = async (id: string, joinedCount: number) => {
    if (joinedCount > 0) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "Tournament has joined players. Use Cancel instead." });
      return;
    }
    if (!confirm("Delete this tournament forever?")) return;
    try {
      await deleteDoc(doc(db, 'tournaments', id));
      toast({ title: "Deleted", description: "Tournament removed from the system." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    }
  };

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
      toast({ title: "Intelligence Broadcasted", description: "Warriors notified and credentials locked." });
      setRoomDistTourney(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'users', label: 'Warriors', icon: Users },
    { id: 'tournaments', label: 'Battles', icon: Trophy },
    { id: 'withdrawals', label: 'Payout Requests', icon: DollarSign, badge: withdrawals?.length },
    { id: 'rooms', label: 'Room Dispatch', icon: Zap },
    { id: 'reports', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#111] border-r border-white/5 transition-all duration-300",
        isSidebarOpen ? "w-72" : "w-24"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              <ShieldAlert className="text-black w-6 h-6" />
            </div>
            {isSidebarOpen && <span className="font-headline font-bold text-xl tracking-tighter">X-COMMAND</span>}
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as AdminSection)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative",
                  activeSection === item.id ? "bg-primary text-black" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", activeSection === item.id ? "text-black" : "group-hover:text-primary")} />
                {isSidebarOpen && (
                  <span className="flex-1 text-left font-bold text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
                )}
                {item.badge ? (
                  <Badge className={cn(
                    "absolute -top-1 -right-1 bg-rose-500 text-white border-none text-[8px] px-1.5 h-4 min-w-4 flex items-center justify-center",
                    !isSidebarOpen && "top-2 right-4"
                  )}>{item.badge}</Badge>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5">
             <Button variant="ghost" className="w-full justify-start gap-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl h-14" onClick={() => window.location.href = '/'}>
                <XCircle className="w-5 h-5" />
                {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Exit Command</span>}
             </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-72" : "ml-24"
      )}>
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 bg-[#0D0D0D]/80 backdrop-blur-2xl sticky top-0 z-40">
           <div className="flex items-center gap-6">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="rounded-xl bg-white/5"><Menu className="w-5 h-5" /></Button>
             <h2 className="text-[11px] font-headline font-bold uppercase tracking-[0.3em] text-primary">{activeSection}</h2>
           </div>
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                 <p className="text-sm font-bold leading-none">{adminProfile?.username}</p>
                 <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1.5">Super Admin • Live</p>
               </div>
               <div className="w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-primary" />
               </div>
             </div>
           </div>
        </header>

        <ScrollArea className="flex-1 p-10">
           {/* Section: Dashboard */}
           {activeSection === 'dashboard' && (
             <div className="space-y-10 animate-in-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Revenue', value: '₹4.2M', icon: DollarSign, trend: '+12%', color: 'text-primary' },
                    { label: 'Registered Warriors', value: users?.length || '0', icon: Users, trend: '+3%', color: 'text-blue-400' },
                    { label: 'Live Battles', value: tournaments?.filter((t:any) => t.status === 'ongoing').length || '0', icon: Trophy, color: 'text-amber-500' },
                    { label: 'Payout Volume', value: '₹120K', icon: Wallet, color: 'text-rose-500' },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-[#111] border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-white/10 transition-all">
                      <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                           <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}><stat.icon className="w-6 h-6" /></div>
                           {stat.trend && <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-[10px] font-black">{stat.trend}</Badge>}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-headline font-bold mt-2 tracking-tighter">{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <Card className="lg:col-span-2 bg-[#111] border-white/5 rounded-[3rem] overflow-hidden">
                      <CardHeader className="p-10 border-b border-white/5">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">Operational Pulse</CardTitle>
                          <History className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y divide-white/5">
                            {auditLogs?.slice(0, 10).map((log: any) => (
                              <div key={log.id} className="p-8 flex items-center gap-6 hover:bg-white/[0.02] transition-colors">
                                 <Badge variant="outline" className="text-[9px] uppercase tracking-tighter shrink-0 border-white/10 font-black h-8 px-3">
                                   {log.timestamp?.toDate().toLocaleTimeString()}
                                 </Badge>
                                 <div className="flex-1">
                                    <p className="text-sm font-bold leading-relaxed">{log.details}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                      <Zap className="w-3 h-3 text-primary" /> Action: {log.action}
                                    </p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden h-fit">
                      <CardHeader className="p-10 border-b border-white/5">
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">Action Required</CardTitle>
                      </CardHeader>
                      <CardContent className="p-10 space-y-6">
                         {[
                           { label: 'Payout Requests', count: withdrawals?.length || 0, color: 'bg-rose-500', href: 'withdrawals' },
                           { label: 'Room Broadcasts', count: tournaments?.filter((t:any) => t.status === 'ongoing' && !t.roomDistributed).length || 0, color: 'bg-amber-500', href: 'rooms' },
                           { label: 'Match Results', count: tournaments?.filter((t:any) => t.status === 'ongoing' && !t.resultsUploaded).length || 0, color: 'bg-blue-500', href: 'tournaments' },
                         ].map((task, i) => (
                           <button 
                            key={i} 
                            onClick={() => setActiveSection(task.href as any)}
                            className="w-full flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group"
                           >
                              <span className="text-[10px] font-bold uppercase tracking-widest">{task.label}</span>
                              <Badge className={cn("text-white border-none font-black h-8 w-8 flex items-center justify-center rounded-xl", task.color)}>{task.count}</Badge>
                           </button>
                         ))}
                      </CardContent>
                   </Card>
                </div>
             </div>
           )}

           {/* Section: Tournaments */}
           {activeSection === 'tournaments' && (
             <div className="space-y-8 animate-in-fade">
                <div className="flex flex-col md:flex-row justify-between items-center bg-[#111] p-8 rounded-[3rem] border border-white/5 gap-6">
                   <div className="relative flex-1 w-full">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        placeholder="Search battles by name..." 
                        className="bg-white/5 border-white/5 pl-14 h-16 rounded-2xl text-sm font-medium focus:border-primary/50" 
                        value={tourneySearch}
                        onChange={e => setTourneySearch(e.target.value)}
                      />
                   </div>
                   <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary text-black font-black rounded-2xl h-16 px-10 flex gap-3 shadow-lg shadow-primary/20">
                          <Plus className="w-5 h-5" /> NEW BATTLE
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[3rem] max-w-2xl p-10">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-headline font-bold">Deploy New Tournament</DialogTitle>
                          <DialogDescription className="text-xs pt-2">Set arena parameters for the next clash.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-6 py-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Battle Title</Label>
                              <Input value={newTourney.title} onChange={e => setNewTourney({...newTourney, title: e.target.value})} placeholder="e.g. Sunday Pro Cup" className="bg-background/50 border-white/10 h-12 rounded-xl" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Map</Label>
                              <Select onValueChange={v => setNewTourney({...newTourney, map: v})} defaultValue={newTourney.map}>
                                <SelectTrigger className="h-12 bg-background/50 border-white/10 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-white/10">
                                  {['Bermuda', 'Purgatory', 'Kalahari', 'Alpine'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                              </Select>
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Entry Fee (₹)</Label>
                              <Input type="number" value={newTourney.entryFee} onChange={e => setNewTourney({...newTourney, entryFee: parseInt(e.target.value)})} className="bg-background/50 border-white/10 h-12 rounded-xl" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Total Prize (₹)</Label>
                              <Input type="number" value={newTourney.totalPrize} onChange={e => setNewTourney({...newTourney, totalPrize: parseInt(e.target.value)})} className="bg-background/50 border-white/10 h-12 rounded-xl" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Time</Label>
                              <Input type="datetime-local" value={newTourney.startTime} onChange={e => setNewTourney({...newTourney, startTime: e.target.value})} className="bg-background/50 border-white/10 h-12 rounded-xl" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Type</Label>
                              <Select onValueChange={v => setNewTourney({...newTourney, type: v as any})} defaultValue={newTourney.type}>
                                <SelectTrigger className="h-12 bg-background/50 border-white/10 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-white/10">
                                  {['Solo', 'Duo', 'Squad'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                           </div>
                        </div>
                        <DialogFooter>
                          <Button className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20" onClick={handleCreateTournament} disabled={isProcessing === 'creating'}>
                            {isProcessing === 'creating' ? <Loader2 className="animate-spin" /> : 'CONFIRM DEPLOYMENT'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                   </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {tournaments?.filter((t:any) => t.title.toLowerCase().includes(tourneySearch.toLowerCase())).map((t: any) => (
                     <Card key={t.id} className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden group hover:border-primary/20 transition-all">
                        <CardContent className="p-10">
                           <div className="flex justify-between items-start mb-8">
                              <div>
                                 <h3 className="font-bold text-xl tracking-tight">{t.title}</h3>
                                 <div className="flex items-center gap-3 mt-2">
                                   <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-white/10 text-muted-foreground font-black px-2">{t.status}</Badge>
                                   <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(t.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-2xl font-headline font-bold text-primary">₹{t.totalPrize.toLocaleString()}</p>
                                 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">PRIZE POOL</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-6 mb-8 bg-white/5 p-6 rounded-3xl border border-white/5">
                              <div className="space-y-1">
                                 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Enrollment</p>
                                 <p className="font-bold text-sm">{t.joinedCount} / {t.maxPlayers} Warriors</p>
                                 <Progress value={(t.joinedCount / t.maxPlayers) * 100} className="h-1.5 bg-white/10 mt-2" />
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Entry Fee</p>
                                 <p className="font-bold text-sm">₹{t.entryFee} / Seat</p>
                                 <div className="h-1.5 w-full bg-white/5 rounded-full mt-2" />
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <Button 
                                variant="outline" 
                                className="rounded-2xl h-14 font-black text-[10px] uppercase border-white/10 bg-white/5 hover:bg-white/10"
                                onClick={() => setActiveSection('rooms')}
                              >
                                <Zap className="w-4 h-4 mr-2 text-primary" /> DISPATCH
                              </Button>
                              <div className="grid grid-cols-2 gap-2">
                                 <Button variant="ghost" size="icon" className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10"><Edit3 className="w-5 h-5" /></Button>
                                 <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                                  onClick={() => handleCancelTournament(t.id)}
                                  disabled={isProcessing === t.id}
                                 >
                                    {isProcessing === t.id ? <Loader2 className="animate-spin w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                 </Button>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                   ))}
                </div>
             </div>
           )}

           {/* Section: Users */}
           {activeSection === 'users' && (
             <div className="space-y-8 animate-in-fade">
                <div className="flex flex-col md:flex-row justify-between items-center bg-[#111] p-8 rounded-[3rem] border border-white/5 gap-6">
                   <div className="relative flex-1 w-full">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        placeholder="Filter warriors by UID or Username..." 
                        className="bg-white/5 border-white/5 pl-14 h-16 rounded-2xl text-sm font-medium focus:border-primary/50" 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                   </div>
                   <Button className="bg-primary text-black font-black rounded-2xl h-16 px-10 flex gap-3 shadow-lg shadow-primary/20">
                      <Filter className="w-5 h-5" /> REFRESH LIST
                   </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {users?.filter((u:any) => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.gameUid?.includes(userSearch)).map((user: any) => (
                     <Card key={user.uid} className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden group hover:border-primary/20 transition-all">
                        <CardContent className="p-8">
                           <div className="flex items-center gap-5 mb-8">
                              <div className="w-16 h-16 bg-white/5 rounded-3xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center">
                                <Users className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                              <div className="flex-1">
                                 <h3 className="font-bold text-lg tracking-tight">{user.username}</h3>
                                 <Badge variant="outline" className="text-[8px] uppercase tracking-widest mt-1.5 border-white/10 text-muted-foreground font-black px-2">{user.status}</Badge>
                              </div>
                              <div className="text-right">
                                 <p className="text-lg font-headline font-bold text-primary">₹{user.walletBalance?.toLocaleString()}</p>
                                 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter mt-1">WALLET</p>
                              </div>
                           </div>
                           
                           <div className="space-y-3 mb-8 text-[11px] font-medium text-muted-foreground bg-white/5 p-5 rounded-2xl border border-white/5">
                              <div className="flex justify-between items-center"><span>Game UID:</span> <span className="text-white font-bold">{user.gameUid || '---'}</span></div>
                              <div className="flex justify-between items-center"><span>Region:</span> <span className="text-white font-bold">{user.gameRegion || '---'}</span></div>
                              <div className="flex justify-between items-center"><span>Role:</span> <Badge variant="outline" className="text-[8px] border-primary/20 text-primary h-5 font-black uppercase">{user.role}</Badge></div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <Button variant="secondary" size="lg" className="rounded-2xl font-black text-[10px] uppercase h-12" onClick={() => setActiveUserAdjust(user)}>ADJUST</Button>
                              <Select onValueChange={(v) => handleToggleStatus(user, v)} defaultValue={user.status}>
                                <SelectTrigger className="rounded-2xl h-12 bg-white/5 border-white/5 text-[10px] font-black uppercase">
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
              <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[3rem] max-w-sm p-10">
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-headline font-bold">Wallet Sync: {activeUserAdjust?.username}</DialogTitle>
                    <DialogDescription className="text-xs pt-2">Modify user balance. Positive to add, negative to deduct.</DialogDescription>
                 </DialogHeader>
                 <div className="py-8 space-y-6">
                    <div className="space-y-3">
                       <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Adjustment Amount (₹)</Label>
                       <Input 
                        type="number" 
                        value={adjAmount} 
                        onChange={e => setAdjAmount(e.target.value)} 
                        className="bg-background/50 border-white/10 h-16 text-3xl font-bold rounded-2xl focus:border-primary"
                       />
                    </div>
                 </div>
                 <DialogFooter>
                    <Button className="w-full h-16 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20" onClick={handleAdjustWallet} disabled={isProcessing === 'adjusting'}>
                       {isProcessing === 'adjusting' ? <Loader2 className="animate-spin" /> : 'EXECUTE ADJUSTMENT'}
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>

           {/* Section: Rooms */}
           {activeSection === 'rooms' && (
             <div className="space-y-8 animate-in-fade">
                <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/20 flex items-center justify-between">
                   <div>
                      <h3 className="text-3xl font-headline font-bold text-primary tracking-tighter uppercase">Intelligence Broadcast</h3>
                      <p className="text-muted-foreground text-sm mt-2 font-medium">Secure match credential distribution for verified warriors.</p>
                   </div>
                   <Zap className="w-16 h-16 text-primary opacity-20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {tournaments?.filter((t:any) => t.status === 'ongoing' || t.status === 'full').map((t: any) => (
                     <Card key={t.id} className={cn(
                       "bg-[#111] border-white/5 rounded-[3rem] overflow-hidden transition-all",
                       t.roomDistributed && "opacity-60 border-emerald-500/20"
                     )}>
                        <CardContent className="p-10">
                           <div className="flex justify-between items-start mb-8">
                              <div>
                                 <h4 className="font-bold text-xl tracking-tight">{t.title}</h4>
                                 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                   <Trophy className="w-3 h-3 text-primary" /> STATUS: {t.status}
                                 </p>
                              </div>
                              {t.roomDistributed && <Badge className="bg-emerald-500 text-black border-none font-black h-8 px-4">DISPATCHED</Badge>}
                           </div>
                           
                           <div className="space-y-6 mb-10 bg-white/5 p-6 rounded-3xl border border-white/5">
                              <div className="space-y-3">
                                 <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Current Room ID</Label>
                                 <div className="h-14 flex items-center px-4 bg-background/50 rounded-2xl border border-white/5 font-headline font-bold text-xl tracking-widest">
                                   {t.roomId || '---'}
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Password</Label>
                                 <div className="h-14 flex items-center px-4 bg-background/50 rounded-2xl border border-white/5 font-headline font-bold text-xl tracking-widest">
                                   {t.roomPassword || '---'}
                                 </div>
                              </div>
                           </div>

                           <Button 
                            className="w-full bg-primary text-black font-black h-16 rounded-[1.5rem] shadow-lg shadow-primary/10"
                            onClick={() => setRoomDistTourney(t)}
                            disabled={t.roomDistributed}
                           >
                              {t.roomDistributed ? 'CREDENTIALS LOCKED' : 'INITIATE BROADCAST'}
                           </Button>
                        </CardContent>
                     </Card>
                   ))}
                </div>
             </div>
           )}

           {/* Section: Withdrawals */}
           {activeSection === 'withdrawals' && (
             <div className="space-y-8 animate-in-fade">
                <Card className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden">
                   <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em]">Payout Review Queue</CardTitle>
                        <p className="text-xs text-muted-foreground">Verify warrior stats before approving credit outflows.</p>
                      </div>
                      <Badge className="bg-rose-500 text-white border-none font-black px-4 h-8">{withdrawals?.length || 0} PENDING</Badge>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y divide-white/5">
                         {withdrawals?.map((tx: any) => (
                           <div key={tx.id} className="p-10 flex flex-col md:flex-row items-center justify-between hover:bg-white/[0.02] transition-colors gap-6">
                              <div className="flex items-center gap-8 w-full md:w-auto">
                                 <div className="p-6 bg-rose-500/10 rounded-[2rem] text-rose-500 shadow-inner">
                                    <ArrowUpRight className="w-8 h-8" />
                                 </div>
                                 <div>
                                    <p className="text-4xl font-headline font-bold tracking-tighter">₹{tx.amount}</p>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                                      Warrior UID: <span className="text-white">{tx.userId?.substring(0, 10)}</span>
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-6 w-full md:w-auto">
                                 <Button variant="ghost" className="rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-widest hover:bg-rose-500/10 hover:text-rose-500">REJECT</Button>
                                 <Button 
                                  className="bg-emerald-500 text-black hover:bg-emerald-600 rounded-[1.5rem] h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20" 
                                  onClick={() => approveWithdrawalAction(tx.id, tx.userId, tx.amount)}
                                 >
                                    VERIFY & DISBURSE
                                 </Button>
                              </div>
                           </div>
                         ))}
                         {withdrawals?.length === 0 && (
                           <div className="p-32 text-center">
                              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-emerald-500 opacity-40" />
                              </div>
                              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px]">Financial reconciliation complete</p>
                              <p className="text-xs text-muted-foreground/40 mt-2 font-medium">All warrior payouts have been processed.</p>
                           </div>
                         )}
                      </div>
                   </CardContent>
                </Card>
             </div>
           )}

           {/* Section: Reports */}
           {activeSection === 'reports' && (
             <div className="space-y-8 animate-in-fade">
                <Card className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden">
                   <CardHeader className="p-10 border-b border-white/5">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">Security Audit Logs</CardTitle>
                        <ShieldAlert className="w-5 h-5 text-rose-500/30" />
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y divide-white/5">
                         {auditLogs?.map((log: any) => (
                           <div key={log.id} className="p-8 flex items-center gap-6 hover:bg-white/[0.01]">
                              <div className="flex flex-col items-center gap-1 shrink-0 w-24">
                                <Badge variant="outline" className="text-[9px] font-black h-7 border-white/10">{log.timestamp?.toDate().toLocaleDateString()}</Badge>
                                <span className="text-[8px] text-muted-foreground uppercase font-black">{log.timestamp?.toDate().toLocaleTimeString()}</span>
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-1">
                                    <Badge className={cn(
                                      "text-[8px] h-5 px-2 font-black uppercase",
                                      log.action.includes('CREATE') ? 'bg-blue-500' : 
                                      log.action.includes('ADJUST') ? 'bg-amber-500' :
                                      log.action.includes('WITHDRAW') ? 'bg-rose-500' : 'bg-primary'
                                    )}>
                                      {log.action}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">by Admin ID: {log.adminId?.substring(0, 8)}</span>
                                 </div>
                                 <p className="text-sm font-medium leading-relaxed">{log.details}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
             </div>
           )}
        </ScrollArea>
      </main>

      {/* Reusable Room Distribution Dialog */}
      <Dialog open={!!roomDistTourney} onOpenChange={() => setRoomDistTourney(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 rounded-[3rem] max-w-sm p-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold text-primary tracking-tight">Intelligence Dispatch</DialogTitle>
            <DialogDescription className="text-xs pt-2">Broadcast battle credentials to all registered warriors of {roomDistTourney?.title}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-3">
              <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest ml-1">Room ID</Label>
              <Input 
                value={roomDetails.roomId} 
                onChange={e => setRoomDetails({...roomDetails, roomId: e.target.value})} 
                placeholder="e.g. 5293810" 
                className="bg-background/50 border-white/10 h-14 rounded-2xl text-xl font-bold tracking-widest focus:border-primary" 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest ml-1">Password</Label>
              <Input 
                value={roomDetails.password} 
                onChange={e => setRoomDetails({...roomDetails, password: e.target.value})} 
                placeholder="e.g. 1234" 
                className="bg-background/50 border-white/10 h-14 rounded-2xl text-xl font-bold tracking-widest focus:border-primary" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-primary text-black font-black rounded-2xl h-16 shadow-xl shadow-primary/20 text-[10px] uppercase tracking-widest" onClick={handleDistributeRoom} disabled={isProcessing === 'distributing'}>
              {isProcessing === 'distributing' ? <Loader2 className="animate-spin" /> : 'BRDCST & GO LIVE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
