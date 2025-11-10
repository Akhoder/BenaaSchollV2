'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/SkeletonLoaders';
import { EmptyState, ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, Loader2, GraduationCap } from 'lucide-react';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function MyClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (profile?.role === 'student') {
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: myClasses, error: cErr } = await fetchMyEnrolledClassesWithDetails();
      if (cErr) {
        console.error(cErr);
        toast.error('Error loading classes');
        return;
      }
      setClasses((myClasses || []) as any[]);

      // Load subjects for each class
      const subs: Record<string, any[]> = {};
      for (const cls of (myClasses || [])) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        subs[cls.id] = (subjects || []) as any[];
      }
      setSubjectsByClass(subs);
    } catch (e) {
      console.error(e);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeaderSkeleton />
          <CardGridSkeleton count={3} />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={School}
          title={t('myClasses') || 'My Classes'}
          description="Choose a class to view subjects and lessons"
          gradient="from-blue-600 via-cyan-600 to-blue-700"
        />

        {classes.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12 text-center animate-fade-in">
              <div className="relative inline-block mb-4">
                <School className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">No Classes Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 font-sans mb-6">You are not enrolled in any classes yet. Browse available classes to get started!</p>
              <Button className="btn-gradient mt-4 animate-pulse-glow" onClick={() => router.push('/dashboard')}>
                Browse Available Classes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {classes.map((cls: any) => (
              <Card 
                key={cls.id} 
                className="card-hover overflow-hidden cursor-pointer"
                onClick={() => router.push(`/dashboard/my-classes/${cls.id}`)}
              >
                <CardHeader className="hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    {/* Class Image with Gradient Border */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                      {cls.image_url ? (
                        <img src={cls.image_url} alt={cls.class_name} className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                          <GraduationCap className="h-10 w-10 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Class Info */}
                    <div className="flex-1 min-w-0 pt-1">
                      <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cls.class_name}
                      </CardTitle>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                            Level {cls.level}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                            {(subjectsByClass[cls.id] || []).length} {((subjectsByClass[cls.id] || []).length === 1 ? 'Subject' : 'Subjects')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
