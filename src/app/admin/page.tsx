
"use client"

import { useState } from 'react';
import { LayoutDashboard, CheckCircle, Clock, AlertTriangle, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { generateMatchRecap } from '@/ai/flows/ai-powered-match-recap-generation';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recapResult, setRecapResult] = useState<string | null>(null);

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
        {/* Pending Approvals */}
        <Card className="bg-card/40 border-white/5">
          <CardHeader className="p-4 border-b border-white/5">
            <CardTitle className="text-sm font-headline flex items-center justify-between">
              Pending Withdrawals <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">12 NEW</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">₹500.00</p>
                    <p className="text-[10px] text-muted-foreground">User: GamerID_{i} • 2h ago</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-500/10 h-8">Reject</Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8">Approve</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground h-10 hover:bg-white/5">View All Requests</Button>
          </CardContent>
        </Card>

        {/* AI Recap Tool Simulation */}
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
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
              disabled={isGenerating}
              onClick={handleGenerateRecap}
            >
              {isGenerating ? 'AI IS THINKING...' : 'GENERATE APEX RECAP'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Report */}
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

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
