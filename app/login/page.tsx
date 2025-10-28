'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(t('loginError'));
    } else {
      toast.success(t('loginSuccess'));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.04] bg-[length:20px_20px]" />
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-teal-500/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-end mb-4">
          <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
            <SelectTrigger className="w-32 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-2xl border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-display font-bold bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">{t('appName')}</CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400 font-sans">{t('welcome')}</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  t('signIn')
                )}
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                {t('dontHaveAccount')}{' '}
                <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  {t('register')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
