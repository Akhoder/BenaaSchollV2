'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, School, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { QuickStatsChart } from '@/components/Charts';
import { supabase, fetchPublishedSubjects, fetchMySubjectEnrollments, enrollInSubject, cancelSubjectEnrollment } from '@/lib/supabase';
import { getStatsOptimized } from '@/lib/optimizedQueries';
import { ChartsWithSuspense } from '@/components/LazyComponents';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
  });
  const [publishedSubjects, setPublishedSubjects] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Record<string, boolean>>({});
  const [enrollingIds, setEnrollingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      fetchStats().catch(err => {
        console.error('Error fetching stats:', err);
      });
      if (profile.role === 'student') {
        void loadStudentData();
      }
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'admin') {
        // استخدام الاستعلام المحسن للمدير
        const { data: statsData, error } = await getStatsOptimized();
        
        if (error) {
          console.error('Error fetching stats:', error);
          return;
        }
        
        if (statsData) {
          setStats(statsData);
        }
      } else if (profile.role === 'teacher') {
        // تحسين استعلامات المعلم
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
        // تحسين استعلامات الطالب
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
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const loadStudentData = async () => {
    try {
      const [pub, mine] = await Promise.all([
        fetchPublishedSubjects(),
        fetchMySubjectEnrollments(),
      ]);
      if (!pub.error && pub.data) setPublishedSubjects(pub.data as any[]);
      const enrolled: Record<string, boolean> = {};
      (mine.data || []).forEach((e: any) => { enrolled[e.subject_id] = true; });
      setMyEnrollments(enrolled);
    } catch (e) {
      console.error(e);
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
      <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden">
          {/* خلفية متحركة */}
          <div className="absolute inset-0 bg-pattern opacity-10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 animate-float"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12 animate-float" style={{animationDelay: '1s'}}></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-display font-bold tracking-tight text-shadow-lg">
              {t('welcomeBack')}, {profile.full_name} 👋
            </h1>
            <p className="text-emerald-50 mt-2 text-xl font-medium font-sans">
              {t(`${profile.role}Dashboard`)}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-blue-100 text-sm">نظام متصل</span>
            </div>
          </div>
        </div>

        {profile.role === 'admin' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t('totalStudents')}
                value={stats.totalStudents}
                icon={Users}
                description={t('activeClasses')}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('totalTeachers')}
                value={stats.totalTeachers}
                icon={Users}
                description="Faculty members"
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('totalClasses')}
                value={stats.totalClasses}
                icon={School}
                description="Active classes"
                gradient="from-amber-500 to-orange-500"
              />
              <StatCard
                title={t('subjects')}
                value={stats.totalSubjects}
                icon={BookOpen}
                description="Academic subjects"
                gradient="from-emerald-500 to-teal-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="card-hover border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {t('recentActivity')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">+</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">طالب جديد مسجل</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">منذ 5 دقائق</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">تم إنشاء فصل جديد</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">منذ ساعة</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    {t('quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button 
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 transition-all hover:shadow-md btn-gradient text-white font-medium"
                    onClick={() => router.push('/dashboard/students')}
                    aria-label="إضافة طالب جديد"
                  >
                    إضافة طالب جديد
                  </button>
                  <button 
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/20 dark:hover:to-teal-950/20 transition-all hover:shadow-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-medium"
                    onClick={() => router.push('/dashboard/classes')}
                    aria-label="إنشاء فصل جديد"
                  >
                    إنشاء فصل جديد
                  </button>
                  <button 
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-950/20 dark:hover:to-orange-950/20 transition-all hover:shadow-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-medium"
                    onClick={() => router.push('/dashboard/teachers')}
                    aria-label="إضافة معلم جديد"
                  >
                    إضافة معلم جديد
                  </button>
                </CardContent>
              </Card>
            </div>

                   <ChartsWithSuspense />
          </>
        )}

        {profile.role === 'student' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('availableCourses') || 'Available Courses'}</CardTitle>
              </CardHeader>
              <CardContent>
                {publishedSubjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('noData') || 'No published courses yet.'}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publishedSubjects.map((s: any) => (
                      <div key={s.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.subject_name}</div>
                          <div className="text-xs text-muted-foreground">{t('class') || 'Class'}: {s.class_id}</div>
                        </div>
                        {myEnrollments[s.id] ? (
                          <button
                            className="px-3 h-9 rounded bg-emerald-600 text-white disabled:opacity-50"
                            disabled
                          >
                            {t('enrolled') || 'Enrolled'}
                          </button>
                        ) : (
                          <button
                            className="px-3 h-9 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            disabled={!!enrollingIds[s.id]}
                            onClick={async () => {
                              try {
                                setEnrollingIds(prev => ({ ...prev, [s.id]: true }));
                                const { error } = await enrollInSubject(s.id);
                                if (error) {
                                  console.error(error);
                                  return;
                                }
                                setMyEnrollments(prev => ({ ...prev, [s.id]: true }));
                              } finally {
                                setEnrollingIds(prev => ({ ...prev, [s.id]: false }));
                              }
                            }}
                          >
                            {t('enroll') || 'Enroll'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('myCourses') || 'My Courses'}</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(myEnrollments).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('noData') || 'No enrollments yet.'}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publishedSubjects.filter((s: any) => myEnrollments[s.id]).map((s: any) => (
                      <div key={s.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.subject_name}</div>
                          <div className="text-xs text-muted-foreground">{t('class') || 'Class'}: {s.class_id}</div>
                        </div>
                        <button
                          className="px-3 h-9 rounded border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          disabled={!!enrollingIds[`c-${s.id}`]}
                          onClick={async () => {
                            try {
                              setEnrollingIds(prev => ({ ...prev, [`c-${s.id}`]: true }));
                              const { error } = await cancelSubjectEnrollment(s.id);
                              if (error) {
                                console.error(error);
                                return;
                              }
                              setMyEnrollments(prev => ({ ...prev, [s.id]: false }));
                            } finally {
                              setEnrollingIds(prev => ({ ...prev, [`c-${s.id}`]: false }));
                            }
                          }}
                        >
                          {t('cancel') || 'Cancel'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('myStudents')}
                value={stats.totalStudents}
                icon={Users}
                description="Total students"
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('schedule')}
                value="5"
                icon={Calendar}
                description="Classes this week"
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  {t('myClasses')}
                </CardTitle>
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
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('myGrades')}
                value="A"
                icon={TrendingUp}
                description="Average grade"
                gradient="from-emerald-500 to-teal-500"
              />
              <StatCard
                title={t('attendance')}
                value="95%"
                icon={Calendar}
                description="Attendance rate"
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {t('mySchedule')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No classes scheduled for today
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    {t('recentActivity')}
                  </CardTitle>
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
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title="Total Students"
                value="0"
                icon={Users}
                description="Students in assigned classes"
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title="Reports"
                value="0"
                icon={BookOpen}
                description="Pending reports"
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Supervised Classes
                </CardTitle>
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
