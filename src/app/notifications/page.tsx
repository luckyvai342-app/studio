
"use client"

import { useMemo } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, Loader2, Trash2, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const notificationsQuery = useMemo(() => {
    if (!authUser) return null;
    return query(
      collection(db, 'notifications'),
      where('userId', '==', authUser.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, authUser]);

  const { data: notifications, loading } = useCollection<any>(notificationsQuery);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast({ title: "Removed", description: "Notification deleted." });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] p-4 pb-24 animate-in-fade">
      <header className="flex items-center justify-between mb-8 mt-4">
        <Link href="/" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-headline font-bold tracking-tight uppercase italic">Intelligence</h1>
        <div className="w-10" />
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {notifications?.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
              <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Quiet in the Arena</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase">No new alerts for you yet.</p>
            </div>
          ) : (
            notifications?.map((n: any) => (
              <Card 
                key={n.id} 
                className={cn(
                  "bg-[#1A1A1A]/40 border-white/5 rounded-3xl overflow-hidden group transition-all duration-300",
                  !n.read && "border-primary/20 bg-primary/[0.02]"
                )}
                onClick={() => markAsRead(n.id)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl h-fit",
                        n.title === "Match Room Details" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      )}>
                        {n.title === "Match Room Details" ? <Zap className="w-5 h-5 fill-emerald-500/20" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm tracking-tight">{n.title}</h3>
                          {!n.read && <Badge className="bg-primary text-black text-[7px] font-black h-4 px-1 rounded-sm uppercase">New</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pr-4">{n.message}</p>
                        <p className="text-[8px] text-muted-foreground/60 font-black uppercase tracking-widest pt-2">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {n.matchId && (
                    <Link href={`/tournaments/${n.matchId}`}>
                      <Button variant="ghost" className="w-full mt-4 h-10 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between px-4 group/btn">
                        Go to Match Arena <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
