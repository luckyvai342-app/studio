
"use client"

import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Trophy, Users, Wallet, ShieldAlert, History, 
  Settings, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Search, Plus, Eye, DollarSign, Ban, RefreshCw, Save, Upload, Zap,
  Menu, X, ChevronRight, BarChart3, MessageSquare, Camera, Filter, ArrowUpRight, Trash2, Edit3, Calendar,
  Image as ImageIcon, CheckCircle2
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

type AdminSection = 'dashboard' | 'users' | 'tournaments' | 'wallet' | 'withdrawals' | 'rooms' | 'screenshots' | 'reports' | 'settings';

export default function AdminDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Real-time admin verification
  const userProfileRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const { data: adminProfile, loading: profileLoading } = useDoc<any>(userProfileRef);

  const isAdmin = adminProfile?.role === 'admin';

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

  // Queries - CRITICAL: Only run these if the user is confirmed as an admin to avoid Security Rule Violations
  const pendingWithdrawalsQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collectionGroup(db, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  }, [db, isAdmin]);

  const allTournamentsQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(50));
  }, [db, isAdmin]);

  const allUsersQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'users'), limit(100));
  }, [db, isAdmin]);

  const auditLogsQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
  }, [db, isAdmin]);

  const resultSubmissionsQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collectionGroup(db, 'resultSubmissions'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  }, [db, isAdmin]);

  const { data: withdrawals } = useCollection<any>(pendingWithdrawalsQuery);
  const { data: tournaments } = useCollection<any>(allTournamentsQuery);
  const { data: users } = useCollection<any>(allUsersQuery);
  const { data: auditLogs } = useCollection<any>(auditLogsQuery);
  const { data: submissions } = useCollection<any>(resultSubmissionsQuery);

  // Security Check
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
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

  const handleApproveSubmission = async (sub: any) => {
    setIsProcessing(sub.id);
    try {
      const subRef = doc(db, 'tournaments', sub.tournamentId, 'resultSubmissions', sub.id);
      await updateDoc(subRef, { status: 'approved', processedAt: serverTimestamp() });
      toast({ title: "Result Approved", description: `Warrior ${sub.username} verified.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSubmission = async (sub: any) => {
    setIsProcessing(sub.id);
    try {
      const subRef = doc(db, 'tournaments', sub.tournamentId, 'resultSubmissions', sub.id);
      await updateDoc(subRef, { status: 'rejected', processedAt: serverTimestamp() });
      toast({ variant: "destructive", title: "Result Rejected", description: "Submission marked as fraudulent." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
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

  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'users', label: 'Warriors', icon: Users },
    { id: 'tournaments', label: 'Battles', icon: Trophy },
    { id: 'withdrawals', label: 'Payout Requests', icon: DollarSign, badge: withdrawals?.length },
    { id: 'screenshots', label: 'Verifications', icon: Camera, badge: submissions?.length },
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
        </header>

        <ScrollArea className="flex-1 p-10">
           {activeSection === 'dashboard' && (
             <div className="space-y-10 animate-in-fade">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Revenue', value: '₹4.2M', icon: DollarSign, trend: '+12%', color: 'text-primary' },
                    { label: 'Registered Warriors', value: users?.length || '0', icon: Users, trend: '+3%', color: 'text-blue-400' },
                    { label: 'Pending Verifications', value: submissions?.length || '0', icon: Camera, color: 'text-amber-500' },
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
             </div>
           )}

           {activeSection === 'screenshots' && (
             <div className="space-y-8 animate-in-fade">
                <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/20 flex items-center justify-between">
                   <div>
                      <h3 className="text-3xl font-headline font-bold text-primary tracking-tighter uppercase">Result Verifications</h3>
                      <p className="text-muted-foreground text-sm mt-2 font-medium">Verify match screenshots to prevent fraudulent wins.</p>
                   </div>
                   <Camera className="w-16 h-16 text-primary opacity-20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {submissions?.map((sub: any) => (
                     <Card key={sub.id} className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden group hover:border-primary/20 transition-all">
                        <div className="relative h-64 bg-black/40">
                           {sub.screenshotUrl ? (
                             <img src={sub.screenshotUrl} alt="Submission" className="w-full h-full object-contain" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                               <ImageIcon className="w-12 h-12 opacity-20" />
                             </div>
                           )}
                           <div className="absolute top-4 left-4">
                              <Badge className="bg-black/60 backdrop-blur-md border border-white/10">{sub.username}</Badge>
                           </div>
                        </div>
                        <CardContent className="p-8">
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Match Reference</p>
                                 <p className="font-bold text-sm mt-1">{sub.tournamentTitle || 'Tournament ID: ' + sub.tournamentId}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Submitted</p>
                                 <p className="font-bold text-sm mt-1">{new Date(sub.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <Button 
                                variant="outline" 
                                className="rounded-2xl h-14 font-black text-[10px] uppercase border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                onClick={() => handleRejectSubmission(sub)}
                                disabled={isProcessing === sub.id}
                              >
                                {isProcessing === sub.id ? <Loader2 className="animate-spin" /> : 'REJECT FAKE'}
                              </Button>
                              <Button 
                                className="rounded-2xl h-14 font-black text-[10px] uppercase bg-primary text-black"
                                onClick={() => handleApproveSubmission(sub)}
                                disabled={isProcessing === sub.id}
                              >
                                {isProcessing === sub.id ? <Loader2 className="animate-spin" /> : 'APPROVE WIN'}
                              </Button>
                           </div>
                        </CardContent>
                     </Card>
                   ))}
                   {submissions?.length === 0 && (
                     <div className="col-span-full py-20 text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 opacity-20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Queue Clear</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2">All submitted results have been processed.</p>
                     </div>
                   )}
                </div>
             </div>
           )}
        </ScrollArea>
      </main>
    </div>
  );
}
