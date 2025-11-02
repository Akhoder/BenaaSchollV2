'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, School, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { QuickStatsChart } from '@/components/Charts';
import { supabase, fetchPublishedClasses, fetchMyClassEnrollments, enrollInClass, cancelClassEnrollment } from '@/lib/supabase';
import { getStatsOptimized } from '@/lib/optimizedQueries';
import { ChartsWithSuspense } from '@/components/LazyComponents';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
  });
  const [publishedClasses, setPublishedClasses] = useState<any[]>([]);
  const [myClassEnrollments, setMyClassEnrollments] = useState<Record<string, boolean>>({});
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
        fetchPublishedClasses(),
        fetchMyClassEnrollments(),
      ]);
      if (!pub.error && pub.data) setPublishedClasses(pub.data as any[]);
      const enrolled: Record<string, boolean> = {};
      (mine.data || []).forEach((e: any) => { enrolled[e.class_id] = true; });
      setMyClassEnrollments(enrolled);
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
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden border border-white/20">
          {/* خلفية متحركة محسنة */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
          }}></div>
          
          {/* عناصر متحركة محسنة */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full animate-float blur-xl" style={{animationDelay: '2s'}}></div>
          
          <div className="relative z-10">
            {/* Avatar و Welcome */}
            <div className="flex items-start gap-4 md:gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md"></div>
                <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <span className="text-3xl md:text-4xl font-bold">{profile.full_name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight flex items-center gap-2">
                  <span className="bg-gradient-to-r from-white to-emerald-50 bg-clip-text text-transparent drop-shadow-lg">
                    {t('welcomeBack')}, {profile.full_name}!
                  </span>
                  <span className="text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl">👋</span>
                </h1>
                <p className="text-emerald-50/90 mt-2 text-lg md:text-xl font-medium font-sans">
                  {t(`${profile.role}Dashboard`)}
                </p>
              </div>
            </div>
            
            {/* Status و Quick Info */}
            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-white text-sm font-medium font-sans">نظام متصل</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Calendar className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium font-sans">
                  {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium font-sans">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>
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
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--primary))]">{language === 'ar' ? 'الفصول المتاحة' : 'Available Classes'}</CardTitle>
              </CardHeader>
              <CardContent>
                {publishedClasses.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد فصول منشورة بعد.' : 'No published classes yet.'}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publishedClasses.map((c: any) => (
                      <div key={c.id} className="p-4 border border-[hsl(var(--border))] rounded-lg flex items-center justify-between card-elegant">
                        <div>
                          <div className="font-medium text-[hsl(var(--foreground))]">{c.class_name}</div>
                          <div className="text-xs text-muted-foreground">ID: {c.id.slice(0, 8)}...</div>
                        </div>
                        {myClassEnrollments[c.id] ? (
                          <button
                            className="px-3 h-9 rounded bg-[hsl(var(--primary))] text-white disabled:opacity-50 font-medium"
                            disabled
                          >
                            {language === 'ar' ? 'مسجل' : 'Enrolled'}
                          </button>
                        ) : (
                          <button
                            className="px-3 h-9 rounded border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-light))] disabled:opacity-50 font-medium transition-colors"
                            disabled={!!enrollingIds[c.id]}
                            onClick={async () => {
                              try {
                                setEnrollingIds(prev => ({ ...prev, [c.id]: true }));
                                const { error } = await enrollInClass(c.id);
                                if (error) {
                                  console.error(error);
                                  toast.error(language === 'ar' ? 'فشل التسجيل' : 'Enrollment failed');
                                  return;
                                }
                                setMyClassEnrollments(prev => ({ ...prev, [c.id]: true }));
                                toast.success(language === 'ar' ? 'تم التسجيل بنجاح' : 'Enrolled successfully');
                                await loadStudentData();
                              } finally {
                                setEnrollingIds(prev => ({ ...prev, [c.id]: false }));
                              }
                            }}
                          >
                            {language === 'ar' ? 'التسجيل' : 'Enroll'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--primary))]">{t('myClasses') || 'My Classes'}</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(myClassEnrollments).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد تسجيلات بعد.' : 'No enrollments yet.'}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {publishedClasses.filter((c: any) => myClassEnrollments[c.id]).map((c: any) => (
                      <div key={c.id} className="p-4 border border-[hsl(var(--border))] rounded-lg flex items-center justify-between card-elegant">
                        <div>
                          <div className="font-medium text-[hsl(var(--foreground))]">{c.class_name}</div>
                          <div className="text-xs text-muted-foreground">ID: {c.id.slice(0, 8)}...</div>
                        </div>
                        <button
                          className="px-3 h-9 rounded border border-red-600 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 font-medium transition-colors"
                          disabled={!!enrollingIds[`c-${c.id}`]}
                          onClick={async () => {
                            try {
                              setEnrollingIds(prev => ({ ...prev, [`c-${c.id}`]: true }));
                              const { error } = await cancelClassEnrollment(c.id);
                              if (error) {
                                console.error(error);
                                toast.error(language === 'ar' ? 'فشل الإلغاء' : 'Cancel failed');
                                return;
                              }
                              setMyClassEnrollments(prev => ({ ...prev, [c.id]: false }));
                              toast.success(language === 'ar' ? 'تم الإلغاء' : 'Cancelled');
                              await loadStudentData();
                            } finally {
                              setEnrollingIds(prev => ({ ...prev, [`c-${c.id}`]: false }));
                            }
                          }}
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
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
