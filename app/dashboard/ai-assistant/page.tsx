'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { AIChatInterface } from '@/components/AIChatInterface';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Bot } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AIAssistantPage() {
  const { profile, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'student')) {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Bot}
          title={t('aiAssistant') || 'AI Assistant'}
          description={
            profile.language_preference === 'ar'
              ? 'مساعدك الذكي الشخصي - اسأل أي سؤال أكاديمي واحصل على إجابات فورية'
              : profile.language_preference === 'fr'
              ? 'Votre assistant intelligent personnel - Posez n\'importe quelle question académique et obtenez des réponses instantanées'
              : 'Your personal intelligent assistant - Ask any academic question and get instant answers'
          }
          gradient="from-purple-600 via-indigo-600 to-purple-700"
        />
        <div className="h-[calc(100vh-280px)] min-h-[600px]">
          <AIChatInterface />
        </div>
      </div>
    </DashboardLayout>
  );
}

