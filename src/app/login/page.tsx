
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, User as UserIcon, Gamepad2, ShieldCheck, ArrowRight, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    ffid: '',
    phone: '',
    otp: ''
  });

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ffid || !formData.phone) {
      toast({ variant: "destructive", title: "Incomplete details", description: "Please fill all fields to proceed." });
      return;
    }
    setIsLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setStep('otp');
      setIsLoading(false);
      toast({ title: "OTP Sent", description: "Use code 123456 to log in." });
    }, 1200);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit code." });
      return;
    }
    setIsLoading(true);
    // Simulate verification and login
    setTimeout(() => {
      const user = {
        name: formData.name,
        ffid: formData.ffid,
        phone: formData.phone,
        isLoggedIn: true
      };
      localStorage.setItem('ff_user', JSON.stringify(user));
      setIsLoading(false);
      router.push('/');
      toast({ title: "Welcome Legend!", description: `Ready to dominate?` });
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#0D0D0D] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm space-y-8 relative z-10 animate-in-fade">
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-primary/10 rounded-[1.5rem] shadow-[0_0_20px_rgba(0,255,136,0.2)] mb-2">
            <Zap className="w-8 h-8 text-primary fill-primary/20" />
          </div>
          <h1 className="text-3xl font-headline font-bold gradient-text tracking-tighter uppercase">INDIA X E-SPORT</h1>
          <p className="text-muted-foreground text-xs uppercase font-black tracking-[0.2em]">The Ultimate Arena</p>
        </div>

        <Card className="bg-[#1A1A1A]/60 border-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden">
          <CardHeader className="pt-8 text-center">
            <CardTitle className="font-headline text-xl">
              {step === 'info' ? 'Create Profile' : 'Verify Access'}
            </CardTitle>
            <CardDescription className="text-xs">
              {step === 'info' 
                ? 'Fill your battle details to join the community.' 
                : `Security code sent to ${formData.phone}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 px-8">
            {step === 'info' ? (
              <form onSubmit={handleInfoSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Warrior Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                    <Input 
                      id="name" 
                      placeholder="Enter Full Name" 
                      className="pl-12 h-12 bg-background/50 border-white/10 rounded-2xl focus:border-primary/50"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ffid" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Free Fire ID</Label>
                  <div className="relative">
                    <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                    <Input 
                      id="ffid" 
                      placeholder="e.g. 529381023" 
                      className="pl-12 h-12 bg-background/50 border-white/10 rounded-2xl focus:border-primary/50"
                      value={formData.ffid}
                      onChange={(e) => setFormData({...formData, ffid: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Mobile Link</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                    <Input 
                      id="phone" 
                      placeholder="+91 XXXXX XXXXX" 
                      type="tel"
                      className="pl-12 h-12 bg-background/50 border-white/10 rounded-2xl focus:border-primary/50"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <Button className="w-full font-bold h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <span className="flex items-center gap-2">CONTINUE <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="otp" className="text-[10px] uppercase font-bold text-muted-foreground text-center block">Enter 6-Digit Code</Label>
                  <Input 
                    id="otp" 
                    placeholder="......" 
                    maxLength={6}
                    className="text-center text-3xl tracking-[0.5em] font-headline font-bold bg-background/50 border-white/10 h-16 rounded-2xl focus:border-primary"
                    value={formData.otp}
                    onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  />
                </div>
                <Button className="w-full font-bold h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'VERIFY & ENTER'}
                </Button>
                <button 
                  type="button" 
                  className="w-full text-[10px] uppercase font-black text-muted-foreground hover:text-primary transition-colors tracking-widest" 
                  onClick={() => setStep('info')}
                  disabled={isLoading}
                >
                  Edit Details
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
