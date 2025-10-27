'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, School, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
  });

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    if (profile.role === 'admin') {
      const [studentsResult, teachersResult, classesResult, subjectsResult] = await Promise.all([
        supabase.rpc('get_total_students'),
        supabase.rpc('get_total_teachers'),
        supabase.from('classes').select('id', { count: 'exact' }),
        supabase.from('subjects').select('id', { count: 'exact' }),
      ]);

      setStats({
        totalStudents: studentsResult.data || 0,
        totalTeachers: teachersResult.data || 0,
        totalClasses: classesResult.count || 0,
        totalSubjects: subjectsResult.count || 0,
      });
    } else if (profile.role === 'teacher') {
      const [classes, students] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact' }).eq('teacher_id', profile.id),
        supabase
          .from('student_enrollments')
          .select('student_id', { count: 'exact' })
          .in('class_id',
            (await supabase.from('classes').select('id').eq('teacher_id', profile.id)).data?.map(c => c.id) || []
          ),
      ]);

      setStats({
        totalClasses: classes.count || 0,
        totalStudents: students.count || 0,
        totalTeachers: 0,
        totalSubjects: 0,
      });
    } else if (profile.role === 'student') {
      const enrollments = await supabase
        .from('student_enrollments')
        .select('class_id', { count: 'exact' })
        .eq('student_id', profile.id)
        .eq('status', 'active');

      setStats({
        totalClasses: enrollments.count || 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSubjects: 0,
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">{t('loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('welcomeBack')}, {profile.full_name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t(`${profile.role}Dashboard`)}
          </p>
        </div>

        {profile.role === 'admin' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t('totalStudents')}
                value={stats.totalStudents}
                icon={Users}
                description={t('activeClasses')}
              />
              <StatCard
                title={t('totalTeachers')}
                value={stats.totalTeachers}
                icon={Users}
                description="Faculty members"
              />
              <StatCard
                title={t('totalClasses')}
                value={stats.totalClasses}
                icon={School}
                description="Active classes"
              />
              <StatCard
                title={t('subjects')}
                value={stats.totalSubjects}
                icon={BookOpen}
                description="Academic subjects"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No recent activity to display
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('quickActions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Add New Student
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Create Class
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Add Teacher
                  </button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {profile.role === 'teacher' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('myClasses')}
                value={stats.totalClasses}
                icon={School}
                description="Classes you teach"
              />
              <StatCard
                title={t('myStudents')}
                value={stats.totalStudents}
                icon={Users}
                description="Total students"
              />
              <StatCard
                title={t('schedule')}
                value="5"
                icon={Calendar}
                description="Classes this week"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('myClasses')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No classes assigned yet
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {profile.role === 'student' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('myClasses')}
                value={stats.totalClasses}
                icon={School}
                description="Enrolled classes"
              />
              <StatCard
                title={t('myGrades')}
                value="A"
                icon={TrendingUp}
                description="Average grade"
              />
              <StatCard
                title={t('attendance')}
                value="95%"
                icon={Calendar}
                description="Attendance rate"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('mySchedule')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No classes scheduled for today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No recent activity to display
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {profile.role === 'supervisor' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Assigned Classes"
                value="0"
                icon={School}
                description="Classes under supervision"
              />
              <StatCard
                title="Total Students"
                value="0"
                icon={Users}
                description="Students in assigned classes"
              />
              <StatCard
                title="Reports"
                value="0"
                icon={BookOpen}
                description="Pending reports"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Supervised Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No classes assigned for supervision yet
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
