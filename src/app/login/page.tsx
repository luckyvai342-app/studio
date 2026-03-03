
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, User as UserIcon, Gamepad2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
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
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all fields." });
      return;
    }
    setIsLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setStep('otp');
      setIsLoading(false);
      toast({ title: "OTP Sent", description: "A simulated 6-digit code has been sent to your phone." });
    }, 1500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter a 6-digit code." });
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
      toast({ title: "Welcome back!", description: `Logged in as ${formData.name}` });
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl rotate-12 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary -rotate-12" />
          </div>
          <h1 className="text-3xl font-headline font-bold gradient-text">INDIA X E-SPORT</h1>
          <p className="text-muted-foreground text-sm">The ultimate arena for Free Fire legends</p>
        </div>

        <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-headline">
              {step === 'info' ? 'Create Account' : 'Verify Identity'}
            </CardTitle>
            <CardDescription>
              {step === 'info' 
                ? 'Enter your details to join the competition.' 
                : `Enter the code sent to ${formData.phone}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'info' ? (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      placeholder="John Doe" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ffid">Free Fire ID</Label>
                  <div className="relative">
                    <Gamepad2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="ffid" 
                      placeholder="e.g. 529381023" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={formData.ffid}
                      onChange={(e) => setFormData({...formData, ffid: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="+91 XXXXX XXXXX" 
                      type="tel"
                      className="pl-10 bg-background/50 border-white/10"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <Button className="w-full font-bold h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'GET OTP'} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">6-Digit OTP</Label>
                  <Input 
                    id="otp" 
                    placeholder="000000" 
                    maxLength={6}
                    className="text-center text-2xl tracking-[1em] font-bold bg-background/50 border-white/10 h-14"
                    value={formData.otp}
                    onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  />
                </div>
                <Button className="w-full font-bold h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'VERIFY & ENTER'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-xs" 
                  onClick={() => setStep('info')}
                  disabled={isLoading}
                >
                  Change details
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
