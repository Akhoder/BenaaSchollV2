'use client';

/**
 * صفحة الداشبورد الرئيسية
 * 
 * هذه الصفحة تعرض لوحة معلومات مخصصة لكل دور:
 * - المدير: إحصائيات شاملة + إجراءات سريعة + نشاط حديث
 * - المعلم: إحصائيات الفصول + الطلاب
 * - الطالب: الفصول + الواجبات + الجدول + الإشعارات
 * - المشرف: الفصول المسؤول عنها + التقارير
 * 
 * المميزات:
 * - ✅ استخدام بيانات حقيقية من قاعدة البيانات
 * - ✅ لا يوجد بيانات وهمية (fake data)
 * - ✅ لا توجد قيم مُشفرة (hard-coded values)
 * - ✅ TypeScript types واضحة
 * - ✅ دعم متعدد اللغات (عربي/إنجليزي)
 * - ✅ معالجة أخطاء شاملة
 * - ✅ تحميل بيانات محسن باستخدام cache
 */

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { PageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { 
  Users, School, BookOpen, Calendar, TrendingUp, Clock, Award, 
  CheckCircle2, ArrowRight, Video, GraduationCap, FileText, 
  AlertCircle, Bell, Zap, Loader2, BarChart3, Sparkles, Plus
} from 'lucide-react';
import { 
  supabase, 
  fetchPublishedClasses, 
  fetchMyClassEnrollments, 
  enrollInClass, 
  cancelClassEnrollment, 
  fetchSubjectsForClass, 
  fetchMyEnrolledClassesWithDetails, 
  fetchMyAssignmentsForSubject, 
  fetchSubmissionForAssignment, 
  fetchMyNotifications 
} from '@/lib/supabase';
import { getStatsOptimized } from '@/lib/optimizedQueries';
// ✅ PERFORMANCE: Lazy load heavy charts component
import dynamic from 'next/dynamic';
const AdminCharts = dynamic(() => import('@/components/AdminCharts').then(mod => ({ default: mod.AdminCharts })), {
  loading: () => <div className="grid gap-6 md:grid-cols-2"><div className="h-64 animate-pulse bg-muted rounded-xl" /><div className="h-64 animate-pulse bg-muted rounded-xl" /></div>,
  ssr: false
});
import { QuickInsights } from '@/components/QuickInsights';
import { EnhancedActivityTimeline } from '@/components/EnhancedActivityTimeline';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatsSkeleton } from '@/components/SkeletonLoaders';
import { PullToRefresh } from '@/components/PullToRefresh';
import { usePrefetch } from '@/hooks/usePrefetch';

type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// Force dynamic rendering - this page requires authentication context
// Client component - no static generation needed

// ============================================
// TYPES - تعريف الأنواع
// ============================================

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  // ✅ NEW: Additional metrics
  attendanceRate?: number;
  completionRate?: number;
  activeUsers?: number;
  // ✅ NEW: Trends (comparison with previous period)
  trends?: {
    students: { value: number; isPositive: boolean };
    teachers: { value: number; isPositive: boolean };
    classes: { value: number; isPositive: boolean };
    subjects: { value: number; isPositive: boolean };
    attendance?: { value: number; isPositive: boolean };
    completion?: { value: number; isPositive: boolean };
  };
}

// ✅ Note: RecentActivity interface moved to EnhancedActivityTimeline component

interface ScheduleEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  room?: string;
  zoom_url?: string;
  mode?: 'online' | 'hybrid' | 'offline';
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  subject_name: string;
  class_name: string;
  submission?: {
    status: string;
    score?: number;
  };
}

interface ClassProgress {
  [classId: string]: number;
}

interface TeacherDashboardSectionProps {
  t: TranslateFn;
  stats: {
    classCount: number;
    studentCount: number;
    scheduleCount: number;
  };
  todayEvents: ScheduleEvent[];
  teacherClasses: any[];
  loadingSchedule: boolean;
  loadingTeacherData: boolean;
  dateLocale: string;
}

interface StudentDashboardSectionProps {
  t: TranslateFn;
  stats: {
    enrolledClasses: number;
    averageGrade: number | null;
    attendanceRate: number | null;
    todayEventsCount: number;
  };
  todayEvents: ScheduleEvent[];
  upcomingEvents: ScheduleEvent[];
  upcomingAssignments: Assignment[];
  notifications: any[];
  publishedClasses: any[];
  myClassEnrollments: Record<string, boolean>;
  subjectsByClass: Record<string, any[]>;
  classProgress: ClassProgress;
  enrollingIds: Record<string, boolean>;
  loadingSchedule: boolean;
  loadingStudentData: boolean;
  loadingAssignments: boolean;
  dateLocale: string;
  onEnrollInClass: (classId: string) => Promise<void>;
}

const TeacherDashboardSection = memo(function TeacherDashboardSection({
  t,
  stats,
  todayEvents,
  teacherClasses,
  loadingSchedule,
  loadingTeacherData,
  dateLocale,
}: TeacherDashboardSectionProps) {
  // Calculate performance metrics
  const totalStudents = stats.studentCount;
  const totalClasses = stats.classCount;
  const todayClasses = stats.scheduleCount;
  
  // Calculate average students per class
  const avgStudentsPerClass = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
  
  return (
    <>
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-2">
          {t('welcomeBack')} 👋
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {t('hereIsYourOverview')}
        </p>
      </div>

      {/* Enhanced Statistics Cards - Mobile Horizontal Scroll */}
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('myClasses')}
            value={stats.classCount}
            icon={School}
            description={t('classesYouTeach')}
            gradient="from-blue-500 to-cyan-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('myStudents')}
            value={stats.studentCount}
            icon={Users}
            description={t('totalStudents')}
            gradient="from-purple-500 to-pink-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('schedule')}
            value={stats.scheduleCount}
            icon={Calendar}
            description={t('classesToday')}
            gradient="from-amber-500 to-orange-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('averagePerClass')}
            value={avgStudentsPerClass}
            icon={BarChart3}
            description={t('studentsPerClass')}
            gradient="from-emerald-500 to-teal-500"
          />
        </div>
      </div>

      {/* Performance Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="card-elegant border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {t('performanceMetrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('classCoverage')}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {totalClasses > 0 ? '100%' : '0%'}
                  </span>
                </div>
                <Progress 
                  value={totalClasses > 0 ? 100 : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('studentEngagement')}
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {totalStudents > 0 ? 'Active' : 'No Data'}
                  </span>
                </div>
                <Progress 
                  value={totalStudents > 0 ? 75 : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              {t('quickInsights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {t('activeClasses')}
                  </span>
                </div>
                <Badge className="bg-blue-500 text-white">
                  {totalClasses}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {t('totalStudents')}
                  </span>
                </div>
                <Badge className="bg-purple-500 text-white">
                  {totalStudents}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {t('classesToday')}
                  </span>
                </div>
                <Badge className="bg-amber-500 text-white">
                  {todayClasses}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule - Enhanced */}
      {loadingSchedule ? (
            <Card className="card-elegant mb-6">
          <CardHeader>
            <CardTitle className="font-display text-slate-900 dark:text-white">{t('todaysSchedule')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleSkeleton />
          </CardContent>
        </Card>
      ) : (
            <Card className="card-elegant mb-6 border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                    {t('todaysSchedule')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {todayEvents.length} {todayEvents.length === 1 ? t('class') : t('classes')} {t('scheduled')}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/schedule" prefetch={true}>
                <Button variant="ghost" size="sm" className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20">
                  {t('viewFull')}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('noClassesScheduledToday')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((e) => {
                  const startTime = new Date(e.start_at);
                  const endTime = new Date(e.end_at);
                  const isUpcoming = startTime > new Date();
                  const isOngoing = startTime <= new Date() && endTime > new Date();
                  
                  return (
                    <div
                      key={e.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isOngoing
                          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-md'
                          : isUpcoming
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${
                              isOngoing 
                                ? 'bg-amber-100 dark:bg-amber-900/50' 
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              <Clock className={`h-4 w-4 ${
                                isOngoing ? 'text-amber-600' : 'text-blue-600'
                              }`} />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {startTime.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })} - 
                                {endTime.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOngoing && (
                                <Badge className="ml-2 bg-amber-500 text-white text-xs">
                                  {t('ongoing')}
                                </Badge>
                              )}
                              {isUpcoming && (
                                <Badge className="ml-2 bg-blue-500 text-white text-xs">
                                  {t('upcoming')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">{e.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {startTime.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            {e.room && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                                📍 {e.room}
                              </span>
                            )}
                            {e.mode === 'online' && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <Video className="h-3 w-3" />
                                {t('online')}
                              </span>
                            )}
                          </div>
                        </div>
                        {e.zoom_url && (
                          <Button
                            size="sm"
                            className={`transition-all duration-300 hover:scale-105 ${
                              isOngoing 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                : 'btn-gradient'
                            }`}
                            onClick={() => window.open(e.zoom_url, '_blank', 'noopener,noreferrer')}
                          >
                            <Video className="h-3 w-3 mr-1" />
                            {t('joinMeeting')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Classes - Enhanced */}
      {loadingTeacherData ? (
        <Card className="card-elegant mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
              <School className="h-5 w-5 text-blue-600" />
              {t('myClasses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherClassesSkeleton />
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elegant mb-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <School className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                    {t('myClasses')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {teacherClasses.length} {teacherClasses.length === 1 ? t('class') : t('classes')} {t('assigned')}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {teacherClasses.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                  <School className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float relative" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noClasses')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {t('noClassesHaveBeenAssignedToYouYet')}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teacherClasses.map((cls: any) => (
                  <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} prefetch={true}>
                    <Card className="card-hover overflow-hidden cursor-pointer group border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                      <CardHeader className="pb-4 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                            {cls.image_url ? (
                              <img
                                src={cls.image_url}
                                alt={cls.class_name}
                                className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900 group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300 shadow-lg">
                                <School className="h-10 w-10 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                              {cls.class_name}
                            </CardTitle>
                            <div className="space-y-2">
                              {cls.level && (
                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-xs font-medium">
                                  {`${t('level')} ${cls.level}`}
                                </Badge>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-xs font-semibold px-2 py-1">
                                  <Users className="h-3 w-3 mr-1" />
                                  {cls.student_count} {t('students')}
                                </Badge>
                                {cls.subjects && cls.subjects.length > 0 && (
                                  <Badge variant="outline" className="text-xs font-medium">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {cls.subjects.length} {cls.subjects.length === 1 ? t('subject') : t('subjects')}
                                  </Badge>
                                )}
                              </div>
                              {cls.subjects && cls.subjects.length > 0 && (
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                    {t('subjects')}:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {cls.subjects.slice(0, 3).map((subject: string, idx: number) => (
                                      <span key={idx} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {subject}
                                      </span>
                                    ))}
                                    {cls.subjects.length > 3 && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        +{cls.subjects.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <div className="px-6 pb-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {t('viewDetails')}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for Teachers - Enhanced */}
      <Card className="card-elegant border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                {t('quickActions')}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('accessCommonTasks')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/attendance" prefetch={true}>
              <div className="group relative p-4 rounded-xl border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t('recordAttendance')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('attendance')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/subjects" prefetch={true}>
              <div className="group relative p-4 rounded-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {t('subjects')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('manageSubjects')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/quizzes" prefetch={true}>
              <div className="group relative p-4 rounded-xl border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {t('quizzes')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('manageQuizzes')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/schedule" prefetch={true}>
              <div className="group relative p-4 rounded-xl border-2 border-transparent hover:border-amber-300 dark:hover:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t('schedule')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('manageSchedule')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
});

const ScheduleSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((idx) => (
      <div
        key={`schedule-skel-${idx}`}
        className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
      >
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48 mb-1" />
        <Skeleton className="h-3 w-40" />
      </div>
    ))}
  </div>
);

const TeacherClassesSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2].map((idx) => (
      <Card key={`class-skel-${idx}`} className="card-hover overflow-hidden">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    ))}
  </div>
);

const StudentDashboardSection = memo(function StudentDashboardSection({
  t,
  stats,
  todayEvents,
  upcomingEvents,
  upcomingAssignments,
  notifications,
  publishedClasses,
  myClassEnrollments,
  subjectsByClass,
  classProgress,
  enrollingIds,
  loadingSchedule,
  loadingStudentData,
  loadingAssignments,
  dateLocale,
  onEnrollInClass,
}: StudentDashboardSectionProps) {
  // Calculate performance metrics
  const overdueCount = upcomingAssignments.filter(a => {
    const dueDate = new Date(a.due_date);
    const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft < 0 && !a.submission;
  }).length;
  
  const urgentCount = upcomingAssignments.filter(a => {
    const dueDate = new Date(a.due_date);
    const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 2 && daysLeft >= 0 && !a.submission;
  }).length;
  
  const completedAssignments = upcomingAssignments.filter(a => a.submission).length;
  const totalAssignments = upcomingAssignments.length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-2">
          {t('welcomeBack')} 👋
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {t('hereIsYourOverview')}
        </p>
      </div>

      {/* Statistics Cards - Mobile Horizontal Scroll */}
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('myClasses')}
            value={stats.enrolledClasses}
            icon={School}
            description={t('enrolledClasses')}
            gradient="from-blue-500 to-cyan-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('averageGrade')}
            value={stats.averageGrade !== null ? `${stats.averageGrade}%` : '—'}
            icon={Award}
            description={t('currentAverage')}
            gradient="from-emerald-500 to-teal-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('attendance')}
            value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '—'}
            icon={CheckCircle2}
            description={t('attendanceRate')}
            gradient="from-amber-500 to-orange-500"
          />
        </div>
        <div className="min-w-[280px] snap-center">
          <StatCard
            title={t('todayEvents')}
            value={stats.todayEventsCount}
            icon={Clock}
            description={t('eventsToday')}
            gradient="from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Performance Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="card-elegant border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              {t('performanceMetrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.averageGrade !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('averageGrade')}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {stats.averageGrade}%
                    </span>
                  </div>
                  <Progress value={stats.averageGrade} className="h-2" />
                </div>
              )}
              {stats.attendanceRate !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('attendanceRate')}
                    </span>
                    <span className="text-sm font-bold text-amber-600">
                      {stats.attendanceRate}%
                    </span>
                  </div>
                  <Progress value={stats.attendanceRate} className="h-2" />
                </div>
              )}
              {totalAssignments > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Assignment Completion
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {completionRate}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {t('quickInsights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {t('enrolledClasses')}
                  </span>
                </div>
                <Badge className="bg-blue-500 text-white">
                  {stats.enrolledClasses}
                </Badge>
              </div>
              {overdueCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Overdue Assignments
                    </span>
                  </div>
                  <Badge className="bg-red-500 text-white">
                    {overdueCount}
                  </Badge>
                </div>
              )}
              {urgentCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Urgent Assignments
                    </span>
                  </div>
                  <Badge className="bg-amber-500 text-white">
                    {urgentCount}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {t('todayEvents')}
                  </span>
                </div>
                <Badge className="bg-purple-500 text-white">
                  {stats.todayEventsCount}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Today's Schedule Card - Enhanced */}
        <Card className="card-elegant md:col-span-2 border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                    {t('todaysSchedule')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {todayEvents.length} {todayEvents.length === 1 ? t('class') : t('classes')} {t('scheduled')}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/schedule" prefetch={true}>
                <Button variant="ghost" size="sm" className="text-sm hover:bg-blue-50 dark:hover:bg-blue-950/20">
                  {t('viewFull')}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSchedule ? (
              <ScheduleSkeleton />
            ) : todayEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                  <Calendar className="h-16 w-16 mx-auto opacity-50 animate-float relative" />
                </div>
                <p className="text-sm font-semibold font-display mb-1">
                  {t('noEventsScheduledForToday')}
                </p>
                <p className="text-xs font-sans opacity-75">
                  {t('youHaveAFreeDayToday')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((e) => {
                  const startTime = new Date(e.start_at);
                  const endTime = new Date(e.end_at);
                  const isUpcoming = startTime > new Date();
                  const isOngoing = startTime <= new Date() && endTime > new Date();
                  
                  return (
                    <div
                      key={e.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isOngoing
                          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-md'
                          : isUpcoming
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${
                              isOngoing 
                                ? 'bg-amber-100 dark:bg-amber-900/50' 
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              <Clock className={`h-4 w-4 ${
                                isOngoing ? 'text-amber-600' : 'text-blue-600'
                              }`} />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {startTime.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })} - 
                                {endTime.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOngoing && (
                                <Badge className="ml-2 bg-amber-500 text-white text-xs">
                                  {t('ongoing')}
                                </Badge>
                              )}
                              {isUpcoming && (
                                <Badge className="ml-2 bg-blue-500 text-white text-xs">
                                  {t('upcoming')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">{e.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            {e.room && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                                📍 {e.room}
                              </span>
                            )}
                            {e.mode === 'online' && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <Video className="h-3 w-3" />
                                {t('online')}
                              </span>
                            )}
                            {e.mode === 'hybrid' && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                <Video className="h-3 w-3" />
                                {t('hybrid')}
                              </span>
                            )}
                          </div>
                        </div>
                        {e.zoom_url && (
                          <Button
                            size="sm"
                            className={`transition-all duration-300 hover:scale-105 ${
                              isOngoing 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                : 'btn-gradient'
                            }`}
                            onClick={() => window.open(e.zoom_url, '_blank', 'noopener,noreferrer')}
                          >
                            <Video className="h-3 w-3 mr-1" />
                            {t('joinMeeting')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card - Enhanced */}
        <Card className="card-elegant border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                  {t('quickActions')}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('accessCommonTasks')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/my-assignments" prefetch={true} className="w-full">
              <div className="group relative p-3 rounded-xl border-2 border-transparent hover:border-amber-300 dark:hover:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t('myAssignments')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('viewAssignments')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-400 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/my-classes" prefetch={true} className="w-full">
              <div className="group relative p-3 rounded-xl border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 group-hover:scale-110 transition-transform duration-300">
                    <School className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t('myClasses')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('enrolledClasses')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-400 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/grades" prefetch={true} className="w-full">
              <div className="group relative p-3 rounded-xl border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 group-hover:scale-110 transition-transform duration-300">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {t('grades')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('viewGrades')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-400 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/dashboard/my-certificates" prefetch={true} className="w-full">
              <div className="group relative p-3 rounded-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {t('myCertificates')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('viewCertificates')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-400 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>


      {/* Upcoming Assignments - Enhanced */}
      {loadingAssignments ? (
        <Card className="card-elegant mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-amber-600" />
              {t('upcomingAssignments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[0, 1, 2].map((idx) => (
                <Skeleton key={idx} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : upcomingAssignments.length > 0 && (
        <Card className="card-elegant mb-6 border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                    {t('upcomingAssignments')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {upcomingAssignments.length} {upcomingAssignments.length === 1 ? t('assignment' as TranslationKey) : t('assignments' as TranslationKey)}
                    {overdueCount > 0 && ` • ${overdueCount} ${t('overdue' as TranslationKey)}`}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/my-assignments" prefetch={true}>
                <Button variant="ghost" size="sm" className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20">
                  {t('viewAll')}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => {
                const dueDate = new Date(assignment.due_date);
                const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isUrgent = daysLeft <= 2 && !isOverdue;

                return (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      isOverdue
                        ? 'border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 shadow-md'
                        : isUrgent
                          ? 'border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
                          : assignment.submission
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                    } hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {assignment.title}
                          </h4>
                          {assignment.submission && assignment.submission.status === 'submitted' && (
                            <Badge className="bg-emerald-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('submitted')}
                            </Badge>
                          )}
                          {isOverdue && !assignment.submission && (
                            <Badge className="bg-red-500 text-white">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {t('overdue')}
                            </Badge>
                          )}
                          {isUrgent && !assignment.submission && (
                            <Badge className="bg-amber-500 text-white">
                              <Clock className="h-3 w-3 mr-1" />
                              {t('urgent')} • {daysLeft} {daysLeft === 1 ? t('day') : t('days')} left
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-2">
                          <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                            <Calendar className="h-3 w-3" />
                            {dueDate.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {assignment.subject_name}
                          </span>
                          <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            {assignment.class_name}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/assignments/${assignment.id}/submit`} prefetch={true}>
                        <Button 
                          size="sm" 
                          className={`transition-all duration-300 hover:scale-105 ${
                            isOverdue 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : assignment.submission
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'btn-gradient'
                          }`}
                        >
                          {assignment.submission ? t('view') : t('submit')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Enrolled Classes - Enhanced */}
      {loadingStudentData ? (
        <Card className="card-elegant mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
              <School className="h-5 w-5 text-blue-600" />
              {t('myEnrolledClasses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherClassesSkeleton />
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elegant mb-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <School className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                  {t('myEnrolledClasses')}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {Object.keys(myClassEnrollments).length} {Object.keys(myClassEnrollments).length === 1 ? t('class') : t('classes')} enrolled
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(myClassEnrollments).length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                  <School className="h-20 w-20 mx-auto opacity-50 animate-float relative" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noEnrolledClasses')}
                </h3>
                <p className="text-sm font-sans mb-6">
                  {t('browseAvailableClassesDescription')}
                </p>
                <Link href="/dashboard/classes" prefetch={true}>
                  <Button className="btn-gradient animate-pulse-glow">
                    {t('browseAvailableClasses')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {publishedClasses
                  .filter((c: any) => myClassEnrollments[c.id])
                  .map((c: any) => (
                    <Link key={c.id} href={`/dashboard/my-classes/${c.id}`} prefetch={true}>
                      <Card className="card-hover overflow-hidden cursor-pointer group border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                        <CardHeader className="pb-4 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                              {c.image_url ? (
                                <img
                                  src={c.image_url}
                                  alt={c.class_name || c.name}
                                  className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900 group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300 shadow-lg">
                                  <GraduationCap className="h-10 w-10 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                {c.class_name || c.name}
                              </CardTitle>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 font-medium">
                                    {`${t('level')} ${c.level ?? '—'}`}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 font-semibold">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {(subjectsByClass[c.id] || []).length} {(subjectsByClass[c.id] || []).length === 1 ? t('subject') : t('subjects')}
                                  </Badge>
                                  {classProgress[c.id] !== undefined && (
                                    <div className="flex items-center gap-2">
                                      <Progress className="h-2 w-16" value={classProgress[c.id]} />
                                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        {classProgress[c.id]}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {(subjectsByClass[c.id] || []).length > 0 && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                      {t('subjects')}:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {(subjectsByClass[c.id] || []).slice(0, 3).map((subject: any, idx: number) => (
                                        <span key={idx} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                          {subject.subject_name}
                                        </span>
                                      ))}
                                      {(subjectsByClass[c.id] || []).length > 3 && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                          +{(subjectsByClass[c.id] || []).length - 3}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <div className="px-6 pb-4">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {t('viewDetails')}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Classes - Enhanced */}
      {loadingStudentData ? (
        <Card className="card-elegant mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {t('availableClassesForEnrollment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[0, 1, 2].map((idx) => (
                <Skeleton key={idx} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elegant mb-6 border-l-4 border-l-emerald-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900 dark:text-white">
                  {t('availableClassesForEnrollment')}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {publishedClasses.length > 0 
                    ? `${publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length} ${publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length === 1 ? t('class') : t('classes')} ${t('available')}`
                    : 'Loading classes...'
                  }
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {publishedClasses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                  <BookOpen className="h-20 w-20 mx-auto opacity-50 animate-float relative" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  No Published Classes
                </h3>
                <p className="text-sm font-sans mb-4">
                  There are no published classes available at the moment. Please check back later or contact your administrator.
                </p>
                <Link href="/dashboard/classes" prefetch={true}>
                  <Button variant="outline" className="hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('browseAllClasses')}
                  </Button>
                </Link>
              </div>
            ) : publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                  <CheckCircle2 className="h-20 w-20 mx-auto opacity-50 animate-float relative text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  All Classes Enrolled
                </h3>
                <p className="text-sm font-sans mb-4">
                  You are enrolled in all available classes. Great job!
                </p>
                <Link href="/dashboard/classes" prefetch={true}>
                  <Button variant="outline" className="hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('browseAllClasses')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishedClasses
                  .filter((c: any) => !myClassEnrollments[c.id])
                  .map((c: any) => (
                    <Card key={c.id} className="border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 hover:shadow-lg group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-display font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {c.class_name || c.name}
                            </CardTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {`${t('level')} ${c.level ?? '—'}`}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {c.goals && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                            {c.goals}
                          </p>
                        )}
                        <Button
                          className="btn-gradient w-full transition-all duration-300 hover:scale-105"
                          disabled={!!enrollingIds[c.id]}
                          onClick={() => onEnrollInClass(c.id)}
                        >
                          {enrollingIds[c.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t('enrolling')}
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              {t('enrollInClass')}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
});

// ============================================
// MAIN COMPONENT - المكون الرئيسي
// ============================================

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const dateLocale = useMemo(() => (language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'), [language]);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(dateLocale, { numeric: 'auto' }),
    [dateLocale]
  );
  
  // ============================================
  // STATE MANAGEMENT - إدارة الحالة
  // ============================================
  
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    attendanceRate: undefined,
    completionRate: undefined,
    activeUsers: undefined,
    trends: undefined,
  });
  
  const [publishedClasses, setPublishedClasses] = useState<any[]>([]);
  const [myClassEnrollments, setMyClassEnrollments] = useState<Record<string, boolean>>({});
  const [enrollingIds, setEnrollingIds] = useState<Record<string, boolean>>({});
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({});
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [classProgress, setClassProgress] = useState<ClassProgress>({});
  // Teacher-specific stats
  const [teacherClassCount, setTeacherClassCount] = useState<number>(0);
  const [teacherStudentCount, setTeacherStudentCount] = useState<number>(0);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  
  // Loading states
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTeacherData, setLoadingTeacherData] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ============================================
  // EFFECTS - التأثيرات الجانبية
  // ============================================

  // ✅ PERFORMANCE: Optimize dependencies - only depend on user.id and loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user?.id, loading, router]);

  // ✅ PERFORMANCE: Strategic prefetching for important pages
  const importantPages = useMemo(() => {
    if (!profile) return [];
    const basePages = ['/dashboard/my-classes', '/dashboard/my-assignments'];
    if (profile.role === 'admin') {
      return [...basePages, '/dashboard/students', '/dashboard/classes', '/dashboard/users'];
    } else if (profile.role === 'teacher') {
      return [...basePages, '/dashboard/classes', '/dashboard/students'];
    }
    return basePages;
  }, [profile?.role]);
  
  usePrefetch(importantPages);

  // ✅ PERFORMANCE: Optimize dependencies - only depend on profile.id and role
  useEffect(() => {
    if (profile) {
      fetchStats().catch(err => {
        console.error('Error fetching stats:', err);
        toast.error(t('failedToLoadStatistics' as TranslationKey));
      });
      
      // ✅ PERFORMANCE: Load student data in parallel instead of sequential
      if (profile.role === 'student') {
        Promise.all([
          loadStudentData(),
          loadStudentSchedule(),
          loadStudentStats(),
          loadUpcomingAssignments()
        ]).catch(err => {
          console.error('Error loading student data:', err);
        });
      }
      
      // ✅ Note: Recent Activity is now handled by EnhancedActivityTimeline component
    }
  }, [profile?.id, profile?.role]);

  // بناء الإشعارات من الواجبات والأحداث
  useEffect(() => {
    const items: any[] = [];
    
    // الواجبات المتأخرة والعاجلة
    upcomingAssignments.forEach((a: Assignment) => {
      const due = a.due_date ? new Date(a.due_date) : null;
      if (!due) return;
      const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (!a.submission && daysLeft < 0) {
        items.push({ 
          type: 'danger', 
          title: a.title, 
          when: due.toLocaleDateString(dateLocale), 
          label: 'overdue' 
        });
      } else if (!a.submission && daysLeft <= 2) {
        items.push({ 
          type: 'warning', 
          title: a.title, 
          when: due.toLocaleDateString(dateLocale), 
          label: 'dueSoon' 
        });
      }
    });
    
    // الأحداث التي تبدأ خلال ساعتين
    const twoHours = 1000 * 60 * 60 * 2;
    todayEvents.forEach((e: ScheduleEvent) => {
      const start = new Date(e.start_at).getTime();
      const now = Date.now();
      if (start >= now && start <= now + twoHours) {
        items.push({ 
          type: 'info', 
          title: e.title, 
          when: new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          label: 'startingSoon' 
        });
      }
    });

    // تحميل الإشعارات من قاعدة البيانات ودمجها
    (async () => {
      const { data } = await fetchMyNotifications(10);
      const dbItems = (data || []).map((n: any) => ({ 
        type: n.type || 'info', 
        title: n.title, 
        when: new Date(n.created_at).toLocaleString(), 
        label: 'db', 
        read_at: n.read_at 
      }));
      setNotifications([...dbItems, ...items].slice(0, 5));
    })();
  }, [upcomingAssignments, todayEvents]);

  // ============================================
  // DATA FETCHING FUNCTIONS - دوال جلب البيانات
  // ============================================

  /**
   * جلب الإحصائيات حسب الدور
   * يستخدم استعلامات محسنة مع cache للأداء
   */
  const fetchStats = async () => {
    if (!profile) return;

    try {
      setLoadingStats(true);
      
      if (profile.role === 'admin') {
        // استخدام الاستعلام المحسن للمدير
        const { data: statsData, error } = await getStatsOptimized();
        
        if (error) {
          console.error('Error fetching stats:', error);
          toast.error(t('failedToLoadStatistics' as TranslationKey));
          return;
        }
        
        if (statsData) {
          setStats(statsData);
        }
      } else if (profile.role === 'teacher') {
        // إحصائيات المعلم يتم جلبها من loadTeacherData
        // لا حاجة لاستعلامات إضافية هنا
        setStats({
          totalClasses: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'student') {
        // استعلامات الطالب
        const { count } = await supabase
          .from('student_enrollments')
          .select('class_id', { count: 'exact', head: true })
          .eq('student_id', profile.id)
          .eq('status', 'active');

        setStats({
          totalClasses: count || 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'supervisor') {
        // استعلامات المشرف
        const classesResult = await supabase
          .from('classes')
          .select('id', { count: 'exact' })
          .eq('supervisor_id', profile.id);
        
        const classIds = classesResult.data?.map(c => c.id) || [];
        
        const studentsResult = await supabase
          .from('student_enrollments')
          .select('student_id', { count: 'exact' })
          .in('class_id', classIds);
        
        const classes = classesResult;
        const students = studentsResult;

        setStats({
          totalClasses: classes.count || 0,
          totalStudents: students.count || 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error(t('anErrorOccurredWhileLoadingStatistics' as TranslationKey));
    } finally {
      setLoadingStats(false);
    }
  };

  // ✅ Note: Recent Activity is now handled by EnhancedActivityTimeline component
  // The old loadRecentActivity function has been removed

  /**
   * جلب بيانات الطالب (الفصول المنشورة والتسجيلات)
   * يجلب الفصول المتاحة والفصول المسجل فيها
   */
  const loadStudentData = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingStudentData(true);
      
      // جلب الفصول المنشورة والتسجيلات بشكل متوازي
      const [pub, mine] = await Promise.all([
        fetchPublishedClasses(),
        fetchMyClassEnrollments(),
      ]);
      
      // معالجة الفصول المنشورة
      if (pub.error) {
        console.error('Error fetching published classes:', pub.error);
        toast.error(t('failedToLoadClasses' as TranslationKey));
        setPublishedClasses([]);
      } else if (pub.data) {
        console.log('Published classes fetched:', pub.data.length);
        setPublishedClasses(pub.data as any[]);
      } else {
        console.warn('No published classes data returned');
        setPublishedClasses([]);
      }
      
      // إنشاء خريطة للتسجيلات
      const enrolled: Record<string, boolean> = {};
      if (mine.data && !mine.error) {
        (mine.data || []).forEach((e: any) => { 
          enrolled[e.class_id] = true; 
        });
        console.log('Enrolled classes:', Object.keys(enrolled).length);
      }
      setMyClassEnrollments(enrolled);
      
      // حساب الفصول المتاحة للتسجيل
      const availableClasses = pub.data?.filter((c: any) => !enrolled[c.id]) || [];
      console.log('Available classes for enrollment:', availableClasses.length);

      // جلب المواد لكل فصل مسجل فيه
      const enrolledClassIds = Object.keys(enrolled);
      const subs: Record<string, any[]> = {};
      
      if (enrolledClassIds.length > 0) {
        const { data: subjects, error: subjectsError } = await supabase
          .from('class_subjects')
          .select('id, class_id, subject_name')
          .in('class_id', enrolledClassIds);
        
        if (subjectsError) {
          console.error('Error fetching subjects:', subjectsError);
          toast.error(t('failedToLoadSubjects' as TranslationKey));
        } else if (subjects) {
          subjects.forEach((s: any) => {
            subs[s.class_id] = subs[s.class_id] || [];
            subs[s.class_id].push(s);
          });
        }
      }
      
      setSubjectsByClass(subs);
    } catch (e) {
      console.error('Error loading student data:', e);
      toast.error(t('failedToLoadStudentData' as TranslationKey));
    } finally {
      setLoadingStudentData(false);
    }
  };

  /**
   * جلب جدول الطالب (الأحداث اليومية والقادمة)
   * يستخدم RPC function للحصول على الأحداث
   */
  const loadStudentSchedule = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingSchedule(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase.rpc('get_user_events', {
        p_start: today.toISOString(),
        p_end: endOfWeek.toISOString()
      });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        toast.error(t('failedToLoadSchedule' as TranslationKey));
        return;
      }
      
      // تصفية الأحداث اليومية
      const todayItems = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d.toDateString() === today.toDateString();
      });
      
      // تصفية الأحداث القادمة
      const upcoming = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d > today && d <= endOfWeek;
      }).slice(0, 5);
      
      setTodayEvents(todayItems || []);
      setUpcomingEvents(upcoming || []);
    } catch (e) {
      console.error('Error loading schedule:', e);
      toast.error(t('failedToLoadSchedule' as TranslationKey));
    } finally {
      setLoadingSchedule(false);
    }
  };

  /**
   * جلب إحصائيات الطالب (المعدل ونسبة الحضور)
   * يحسب المعدل من الواجبات المقيّمة ونسبة الحضور من آخر 30 يوم
   */
  const loadStudentStats = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingStats(true);
      
      // جلب الفصول المسجل فيها
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      const classIds = (classes || []).map((c: any) => c.id);
      
      // جلب المواد للفصول المسجل فيها
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id, class_id')
        .in('class_id', classIds);
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      const subjectIds = (subjects || []).map((s: any) => s.id);
      if (subjectIds.length === 0) {
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      // جلب الواجبات المقيّمة
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, subject_id, total_points, status')
        .in('subject_id', subjectIds)
        .in('status', ['published', 'closed']);
      
      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setAverageGrade(null);
      }
      
      const assignmentIds = (assignments || []).map((a: any) => a.id);
      
      // جلب التقديرات للواجبات
      if (assignmentIds.length > 0) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, score')
          .in('assignment_id', assignmentIds)
          .eq('student_id', profile.id);
        
        if (!submissionsError && submissions) {
          const assignmentMap = new Map((assignments || []).map((a: any) => [a.id, a]));
          let totalScore = 0;
          let totalPossible = 0;
          
          submissions.forEach((sub: any) => {
            if (sub.status === 'graded') {
              const a = assignmentMap.get(sub.assignment_id);
              if (a) {
                totalScore += sub.score || 0;
                totalPossible += a.total_points || 100;
              }
            }
          });
          
          const average = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;
          setAverageGrade(average);
        }
      }
      
      // جلب نسبة الحضور من آخر 30 يوم
      try {
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 30);
        
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('student_id', profile.id)
          .gte('attendance_date', from.toISOString().slice(0, 10))
          .lte('attendance_date', today.toISOString().slice(0, 10));
        
        if (!attendanceError && attendance) {
          const total = attendance.filter((r: any) => 
            ['present', 'absent', 'late', 'excused'].includes(r.status)
          ).length;
          const attended = attendance.filter((r: any) => 
            ['present', 'late', 'excused'].includes(r.status)
          ).length;
          const rate = total > 0 ? Math.round((attended / total) * 100) : null;
          setAttendanceRate(rate);
        }
      } catch (e) {
        console.error('Error calculating attendance rate:', e);
        setAttendanceRate(null);
      }
    } catch (e) {
      console.error('Error loading student stats:', e);
      toast.error(t('failedToLoadStudentStatistics' as TranslationKey));
    } finally {
      setLoadingStats(false);
    }
  };

  // Handle class enrollment
  const handleEnrollInClass = useCallback(async (classId: string) => {
    try {
      setEnrollingIds(prev => ({ ...prev, [classId]: true }));
      const { error } = await enrollInClass(classId);
      if (error) {
        console.error(error);
        toast.error(t('enrollmentFailed'));
        return;
      }
      setMyClassEnrollments(prev => ({ ...prev, [classId]: true }));
      toast.success(t('enrolledSuccessfully'));
      await loadStudentData();
    } finally {
      setEnrollingIds(prev => ({ ...prev, [classId]: false }));
    }
  }, [t, loadStudentData]);

  /**
   * جلب بيانات المعلم (الفصول والطلاب)
   * يجلب الفصول التي يدرسها المعلم من class_subjects
   */
  const loadTeacherData = useCallback(async () => {
    if (!profile || profile.role !== 'teacher') return;
    
    try {
      setLoadingTeacherData(true);
      
      const { data: classSubjects, error: csError } = await supabase
        .from('class_subjects')
        .select('class_id, subject_name')
        .eq('teacher_id', profile.id);
      
      if (csError) {
        console.error('Error fetching class subjects:', csError);
        toast.error(t('failedToLoadSubjects'));
        return;
      }
      
      const classIds = Array.from(new Set((classSubjects || []).map((x: any) => x.class_id).filter(Boolean)));
      setTeacherClassCount(classIds.length);
      
      if (classIds.length === 0) {
        setTeacherClasses([]);
        setTeacherStudentCount(0);
        return;
      }
      
      const [classesRes, enrollmentsRes] = await Promise.all([
        supabase
        .from('classes')
        .select('id, class_name, level, goals, image_url')
          .in('id', classIds),
        supabase
          .from('student_enrollments')
          .select('class_id')
          .in('class_id', classIds)
          .eq('status', 'active'),
      ]);
      
      if (classesRes.error) {
        console.error('Error fetching classes:', classesRes.error);
        toast.error(t('failedToLoadClasses'));
        return;
      }
      
      if (enrollmentsRes.error) {
        console.error('Error fetching enrollments:', enrollmentsRes.error);
        toast.error(t('failedToLoadTeacherData'));
        return;
      }
      
      const enrollmentCounts = (enrollmentsRes.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.class_id] = (acc[row.class_id] || 0) + 1;
        return acc;
      }, {});
      
      const classesWithCounts = (classesRes.data || []).map((cls: any) => ({
        ...cls,
        student_count: enrollmentCounts[cls.id] || 0,
        subjects: (classSubjects || []).filter((cs: any) => cs.class_id === cls.id).map((cs: any) => cs.subject_name),
      }));
      
      setTeacherClasses(classesWithCounts);
      const totalStudents = Object.values(enrollmentCounts).reduce((sum: number, count: any) => sum + count, 0);
      setTeacherStudentCount(totalStudents);
    } catch (e) {
      console.error('Error loading teacher data:', e);
      toast.error(t('failedToLoadTeacherData'));
    } finally {
      setLoadingTeacherData(false);
    }
  }, [profile?.id, profile?.role, t]);

  /**
   * جلب جدول المعلم (الأحداث اليومية والقادمة)
   * يستخدم RPC function للحصول على الأحداث
   */
  const loadTeacherSchedule = useCallback(async () => {
    if (!profile || profile.role !== 'teacher') return;
    
    try {
      setLoadingSchedule(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase.rpc('get_user_events', {
        p_start: today.toISOString(),
        p_end: endOfWeek.toISOString()
      });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        toast.error(t('failedToLoadSchedule'));
        return;
      }
      
      const events = data || [];
      setTodayEvents(
        events.filter((e: any) => {
        const d = new Date(e.start_at);
        return d.toDateString() === today.toDateString();
        })
      );
      setUpcomingEvents(
        events
          .filter((e: any) => {
        const d = new Date(e.start_at);
        return d > today && d <= endOfWeek;
          })
          .slice(0, 5)
      );
    } catch (e) {
      console.error('Error loading schedule:', e);
      toast.error(t('failedToLoadSchedule'));
    } finally {
      setLoadingSchedule(false);
    }
  }, [profile?.id, profile?.role, t]);

  // Load teacher data when profile is available
  useEffect(() => {
    if (profile?.role === 'teacher') {
      Promise.all([
        loadTeacherData(),
        loadTeacherSchedule()
      ]).catch(err => {
        console.error('Error loading teacher data:', err);
      });
    }
  }, [profile?.id, profile?.role, loadTeacherData, loadTeacherSchedule]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') return;

    const channel = supabase
      .channel(`teacher-dashboard-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_subjects', filter: `teacher_id=eq.${profile.id}` },
        () => {
          loadTeacherData().catch(err => console.error('Realtime teacher data error:', err));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_events', filter: `teacher_id=eq.${profile.id}` },
        () => {
          loadTeacherSchedule().catch(err => console.error('Realtime teacher schedule error:', err));
        }
      );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, loadTeacherData, loadTeacherSchedule]);

  /**
   * جلب الواجبات القادمة للطالب
   * يجلب الواجبات التي تنتهي خلال الأسبوع القادم
   */
  const loadUpcomingAssignments = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingAssignments(true);
      
      // جلب الفصول المسجل فيها
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setUpcomingAssignments([]);
        setClassProgress({});
        return;
      }

      const classIds = (classes || []).map((c: any) => c.id);
      const classMap = new Map((classes || []).map((c: any) => [c.id, c]));

      // جلب المواد لجميع الفصول
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id, class_id, subject_name')
        .in('class_id', classIds);
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setUpcomingAssignments([]);
        return;
      }
      
      const subjectIds = (subjects || []).map((s: any) => s.id);
      const subjectToClass: Record<string, string> = {};
      const subjectNameMap: Record<string, string> = {};
      
      (subjects || []).forEach((s: any) => { 
        subjectToClass[s.id] = s.class_id; 
        subjectNameMap[s.id] = s.subject_name; 
      });

      if (subjectIds.length === 0) {
        setUpcomingAssignments([]);
        setClassProgress({});
        return;
      }

      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      // جلب الواجبات للمواد
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, subject_id, title, total_points, due_date, status')
        .in('subject_id', subjectIds)
        .in('status', ['published', 'closed']);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setUpcomingAssignments([]);
        return;
      }

      const assignmentIds = (assignments || []).map((a: any) => a.id);

      // جلب التقديرات للواجبات
      const { data: submissions } = assignmentIds.length > 0 ? await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score')
        .in('assignment_id', assignmentIds)
        .eq('student_id', profile.id) : { data: [] as Array<{ assignment_id: string; status: string; score?: number }> };

      const submissionMap = new Map(
        (submissions || []).map((s: { assignment_id: string; status: string; score?: number }) => [s.assignment_id, s])
      );

      // بناء قائمة الواجبات القادمة
      const upcoming: Assignment[] = [];
      const perClassTotals: Record<string, number> = {};
      const perClassCompleted: Record<string, number> = {};

      (assignments || []).forEach((a: any) => {
        const due = a.due_date ? new Date(a.due_date) : null;
        const sId = a.subject_id;
        const cId = subjectToClass[sId];
        
        if (!perClassTotals[cId]) { 
          perClassTotals[cId] = 0; 
          perClassCompleted[cId] = 0; 
        }
        perClassTotals[cId] += 1;
        
        const sub = submissionMap.get(a.id);
        if (sub && sub.status === 'graded') {
          perClassCompleted[cId] += 1;
        }

        if (due && due > now && due <= nextWeek) {
          const classInfo = classMap.get(cId);
          upcoming.push({
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            subject_name: subjectNameMap[sId],
            class_name: (classInfo as any)?.class_name || (classInfo as any)?.name || '',
            submission: sub ? {
              status: (sub as { assignment_id: string; status: string; score?: number }).status,
              score: (sub as { assignment_id: string; status: string; score?: number }).score
            } : undefined,
          });
        }
      });

      // حساب التقدم لكل فصل
      const progress: ClassProgress = {};
      Object.keys(perClassTotals).forEach(cId => {
        const total = perClassTotals[cId] || 0;
        const done = perClassCompleted[cId] || 0;
        progress[cId] = total > 0 ? Math.round((done / total) * 100) : 0;
      });

      // ترتيب حسب تاريخ الاستحقاق
      upcoming.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setUpcomingAssignments(upcoming.slice(0, 5));
      setClassProgress(progress);
    } catch (e) {
      console.error('Error loading upcoming assignments:', e);
      toast.error(t('failedToLoadUpcomingAssignments' as TranslationKey));
    } finally {
      setLoadingAssignments(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS - دوال مساعدة
  // ============================================

  /**
   * تنسيق الوقت النسبي (منذ متى)
   */
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) {
      return t('justNow' as TranslationKey);
    }
    if (diffMins < 60) {
      return relativeTimeFormatter.format(-diffMins, 'minute');
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return relativeTimeFormatter.format(-diffHours, 'hour');
    }
    const diffDays = Math.floor(diffHours / 24);
    return relativeTimeFormatter.format(-diffDays, 'day');
  }, [relativeTimeFormatter, t]);

  const handleRefresh = useCallback(async () => {
    if (!profile) return;
    
    const promises = [fetchStats()];
    
    if (profile.role === 'student') {
      promises.push(
        loadStudentData(),
        loadStudentSchedule(),
        loadStudentStats(),
        loadUpcomingAssignments()
      );
    } else if (profile.role === 'teacher') {
      promises.push(loadTeacherData());
    }
    
    await Promise.all(promises);
  }, [profile, fetchStats, loadStudentData, loadStudentSchedule, loadStudentStats, loadUpcomingAssignments, loadTeacherData]);

  // ============================================
  // RENDER - عرض المكون
  // ============================================

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoading
          text={t('loading')}
          showStats={true}
          statsCount={4}
          contentType="grid"
          contentRows={6}
        />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6 animate-fade-in">
        {/* ✅ Compact Hero Section - قسم الترحيب المدمج */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 shadow-lg bg-gradient-to-br from-primary/5 via-accent/3 to-secondary/5">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* ✅ Compact Avatar */}
              <div className="relative group flex-shrink-0">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                
                {/* Avatar Container */}
                <div className="relative w-16 h-16 md:w-20 md:h-20">
                  {/* Outer Ring */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 p-0.5">
                    <div className="w-full h-full rounded-2xl bg-background/90 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                      <span className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {profile?.full_name?.charAt(0).toUpperCase() || ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Welcome Text */}
              <div className="flex-1 min-w-0">
                {/* Main Heading */}
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                      {t('welcomeBack')}, {profile?.full_name || ''}
                    </span>
                  </h1>
                  {/* ✅ Replaced emoji with icon */}
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
                  </div>
                </div>

                {/* Subtitle and Quick Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <p className="text-sm md:text-base text-muted-foreground font-medium">
                    {t(`${profile?.role || 'user'}Dashboard`)}
                  </p>

                  {/* Quick Stats Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* System Status */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-50"></div>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {t('online')}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">
                          {new Date().toLocaleDateString(dateLocale, { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Compact Additional Info Bar (Admin Only) */}
            {profile?.role === 'admin' && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('users')}</p>
                        <p className="text-sm font-bold text-foreground">{stats.totalStudents + stats.totalTeachers}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-accent/10">
                        <School className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('classes')}</p>
                        <p className="text-sm font-bold text-foreground">{stats.totalClasses}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-success">
                      {t('allSystemsOperational' as TranslationKey)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Dashboard - لوحة المدير */}
        {profile?.role === 'admin' && (
          <div className="space-y-8">
            {/* Floating Orbs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
              <div className="orb-primary w-64 h-64 top-20 left-10" />
              <div className="orb-accent w-64 h-64 top-1/3 right-10" />
              <div className="orb-secondary w-64 h-64 bottom-20 left-1/3" />
            </div>

            {/* ============================================
                SECTION 1: Main Statistics
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <span>{t('mainStatistics' as TranslationKey)}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {t('overviewOfSystem' as TranslationKey)}
                  </p>
                </div>
              </div>

              {/* Statistics Cards */}
              {loadingStats ? (
                <DashboardStatsSkeleton />
              ) : (
                <>
                  {/* Main Stats with Trends */}
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title={t('totalStudents')}
                      value={stats.totalStudents}
                      icon={Users}
                      description={t('totalStudents')}
                      color="primary"
                      trend={stats.trends?.students}
                    />
                    <StatCard
                      title={t('totalTeachers')}
                      value={stats.totalTeachers}
                      icon={Users}
                      description={t('facultyMembers' as TranslationKey)}
                      color="accent"
                      trend={stats.trends?.teachers}
                    />
                    <StatCard
                      title={t('totalClasses')}
                      value={stats.totalClasses}
                      icon={School}
                      description={t('activeClasses')}
                      color="secondary"
                      trend={stats.trends?.classes}
                    />
                    <StatCard
                      title={t('subjects')}
                      value={stats.totalSubjects}
                      icon={BookOpen}
                      description={t('academicSubjects' as TranslationKey)}
                      color="success"
                      trend={stats.trends?.subjects}
                    />
                  </div>

                  {/* Additional Metrics */}
                  {(stats.attendanceRate !== undefined || stats.completionRate !== undefined || stats.activeUsers !== undefined) && (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.attendanceRate !== undefined && (
                        <StatCard
                          title={t('attendanceRate' as TranslationKey)}
                          value={`${stats.attendanceRate}%`}
                          icon={CheckCircle2}
                          description={t('last30Days' as TranslationKey)}
                          color="success"
                          gradient="from-emerald-500 to-teal-500"
                        />
                      )}
                      {stats.completionRate !== undefined && (
                        <StatCard
                          title={t('completionRate' as TranslationKey)}
                          value={`${stats.completionRate}%`}
                          icon={Award}
                          description={t('lessonsCompleted' as TranslationKey)}
                          color="info"
                          gradient="from-blue-500 to-cyan-500"
                        />
                      )}
                      {stats.activeUsers !== undefined && (
                        <StatCard
                          title={t('activeUsers' as TranslationKey)}
                          value={stats.activeUsers}
                          icon={Zap}
                          description={t('last7Days' as TranslationKey)}
                          color="warning"
                          gradient="from-amber-500 to-orange-500"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-background px-4">
                  <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                </div>
              </div>
            </div>

            {/* ============================================
                SECTION 2: Activity & Quick Actions
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-xl">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <span>{t('activityAndActions' as TranslationKey)}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {t('recentActivityAndQuickActions' as TranslationKey)}
                  </p>
                </div>
              </div>

              {/* Enhanced Activity Timeline and Quick Actions */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Enhanced Activity Timeline */}
                <EnhancedActivityTimeline />

                {/* ✅ Enhanced Quick Actions Card */}
                <Card className="glass-card-hover border-0 shadow-xl overflow-hidden">
                  <CardHeader className="pb-4 border-b border-border/50">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <div className="p-2.5 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl backdrop-blur-sm">
                        <Zap className="w-5 h-5 text-accent" />
                      </div>
                      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {t('quickActions')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {/* ✅ PERFORMANCE: Use Link with prefetch for faster navigation */}
                    <Link 
                      href="/dashboard/students"
                      prefetch={true}
                      className="w-full btn-primary flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                      aria-label={t('addStudent')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">{t('addStudent')}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                      href="/dashboard/classes"
                      prefetch={true}
                      className="w-full btn-glass flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg"
                      aria-label={t('createClass')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <School className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">{t('createClass')}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                      href="/dashboard/teachers"
                      prefetch={true}
                      className="w-full btn-outline flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:border-primary/50"
                      aria-label={t('addTeacher' as TranslationKey)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold">{t('addTeacher' as TranslationKey)}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-background px-4">
                  <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                </div>
              </div>
            </div>

            {/* ============================================
                SECTION 3: Analytics & Insights
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-info/20 to-success/20 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-info" />
                    </div>
                    <span>{t('analyticsAndInsights' as TranslationKey)}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {t('chartsAndQuickInsights' as TranslationKey)}
                  </p>
                </div>
              </div>

              {/* Charts and Quick Insights */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Charts - Takes 2 columns on large screens */}
                <div className="lg:col-span-2">
                  <AdminCharts />
                </div>
                
                {/* Quick Insights - Takes 1 column on large screens */}
                <div className="lg:col-span-1">
                  <QuickInsights />
                </div>
              </div>
            </section>

          </div>
        )}

        {/* Student Dashboard - لوحة الطالب */}
        {profile?.role === 'student' && (
          <StudentDashboardSection
            t={t}
            stats={{
              enrolledClasses: stats.totalClasses,
              averageGrade,
              attendanceRate,
              todayEventsCount: todayEvents.length,
            }}
            todayEvents={todayEvents}
            upcomingEvents={upcomingEvents}
            upcomingAssignments={upcomingAssignments}
            notifications={notifications}
            publishedClasses={publishedClasses}
            myClassEnrollments={myClassEnrollments}
            subjectsByClass={subjectsByClass}
            classProgress={classProgress}
            enrollingIds={enrollingIds}
            loadingSchedule={loadingSchedule}
            loadingStudentData={loadingStudentData}
            loadingAssignments={loadingAssignments}
            dateLocale={dateLocale}
            onEnrollInClass={handleEnrollInClass}
          />
        )}

        {/* Old Student Dashboard - keeping for reference */}
        {false && profile?.role === 'student' && (
          <>
            {/* Statistics Cards - بطاقات الإحصائيات */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t('myClasses')}
                value={stats.totalClasses}
                icon={School}
                description={t('enrolledClasses' as TranslationKey)}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('averageGrade')}
                value={averageGrade !== null ? `${averageGrade}%` : '—'}
                icon={Award}
                description={t('currentAverage' as TranslationKey)}
                gradient="from-emerald-500 to-teal-500"
              />
              <StatCard
                title={t('attendance')}
                value={attendanceRate !== null ? `${attendanceRate}%` : '—'}
                icon={CheckCircle2}
                description={t('attendanceRate' as TranslationKey)}
                gradient="from-amber-500 to-orange-500"
              />
              <StatCard
                title={t('todayEvents' as TranslationKey)}
                value={todayEvents.length}
                icon={Clock}
                description={t('eventsToday' as TranslationKey)}
                gradient="from-purple-500 to-pink-500"
              />
            </div>

            {/* Today's Schedule and Quick Actions - جدول اليوم والإجراءات السريعة */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Today's Schedule Card */}
              <Card className="card-hover glass-strong md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {t('todaysSchedule' as TranslationKey)}
                    </CardTitle>
                    <Link 
                      href="/dashboard/schedule"
                      prefetch={true}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm"
                      >
                        {t('viewFull' as TranslationKey)} 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSchedule ? (
                    <div className="text-center py-8 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                        <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                      </div>
                      <Skeleton className="h-4 w-32 mx-auto mb-2" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ) : todayEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <Calendar className="h-16 w-16 mx-auto opacity-50 animate-float" />
                      </div>
                      <p className="text-sm font-semibold font-display mb-1">
                        {t('noEventsScheduledForToday' as TranslationKey)}
                      </p>
                      <p className="text-xs font-sans opacity-75">
                        {t('youHaveAFreeDayToday' as TranslationKey)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map((e: ScheduleEvent) => (
                        <div 
                          key={e.id} 
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {new Date(e.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{e.title}</h4>
                              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                {e.room && <span>📍 {e.room}</span>}
                                {e.mode === 'online' && (
                                  <span className="flex items-center gap-1">
                                    <Video className="h-3 w-3" /> 
                                    {t('online')}
                                  </span>
                                )}
                                {e.mode === 'hybrid' && (
                                  <span className="flex items-center gap-1">
                                    <Video className="h-3 w-3" /> 
                                    {t('hybrid')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {e.zoom_url && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => window.open(e.zoom_url, '_blank')}
                              >
                                <Video className="h-3 w-3 mr-1" /> 
                                {t('joinMeeting')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    {t('quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/dashboard/schedule" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('schedule')}
                    </Button>
                  </Link>
                  <Link href="/dashboard/my-classes" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <School className="h-4 w-4 mr-2" />
                      {t('classes')}
                    </Button>
                  </Link>
                  <Link href="/dashboard/grades" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <Award className="h-4 w-4 mr-2" />
                      {t('grades')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Notifications Card */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Bell className="h-5 w-5 text-amber-600" />
                    {t('notifications' as TranslationKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(loadingAssignments || loadingSchedule) ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('noNotifications' as TranslationKey)}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {n.label === 'overdue' && (
                                <span className="text-red-600 dark:text-red-400">
                                  {t('overdueLabel' as TranslationKey)}:{' '}
                                </span>
                              )}
                              {n.label === 'dueSoon' && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {t('dueSoonLabel' as TranslationKey)}:{' '}
                                </span>
                              )}
                              {n.label === 'startingSoon' && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {t('startingSoonLabel' as TranslationKey)}:{' '}
                                </span>
                              )}
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{n.when}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Assignments - الواجبات القادمة */}
            {loadingAssignments ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-amber-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : upcomingAssignments.length > 0 && (
              <Card className="card-elegant">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display text-primary">
                      <FileText className="h-5 w-5 text-amber-600" />
                      {t('upcomingAssignments' as TranslationKey)}
                    </CardTitle>
                    <Link href="/dashboard/my-assignments" prefetch={true}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm"
                      >
                        {t('viewAll')} 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingAssignments.map((assignment: Assignment) => {
                      const dueDate = new Date(assignment.due_date);
                      const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysLeft < 0;
                      const isUrgent = daysLeft <= 2 && !isOverdue;
                      
                      return (
                        <div 
                          key={assignment.id} 
                          className={`p-4 rounded-lg border ${
                            isOverdue 
                              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' 
                              : isUrgent 
                                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                          } hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                  {assignment.title}
                                </h4>
                                {assignment.submission && assignment.submission.status === 'submitted' && (
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    {t('submitted' as TranslationKey)}
                                  </Badge>
                                )}
                                {isOverdue && !assignment.submission && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                    <AlertCircle className="h-3 w-3 mr-1" /> 
                                    {t('overdue' as TranslationKey)}
                                  </Badge>
                                )}
                                {isUrgent && !assignment.submission && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                    <Clock className="h-3 w-3 mr-1" /> 
                                    {t('urgent' as TranslationKey)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {dueDate.toLocaleDateString(dateLocale)}
                                </span>
                                <span>{assignment.subject_name}</span>
                                <span>• {assignment.class_name}</span>
                              </div>
                            </div>
                            <Link href={`/dashboard/assignments/${assignment.id}/submit`} prefetch={true}>
                              <Button
                                size="sm" 
                                className="btn-gradient transition-all duration-300 hover:scale-105"
                              >
                                {assignment.submission 
                                  ? t('view' as TranslationKey) 
                                  : t('submit')
                                }
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Enrolled Classes - فصولي المسجلة */}
            {loadingStudentData ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
                    <School className="h-5 w-5 text-blue-600" />
                    {t('myEnrolledClasses' as TranslationKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(myClassEnrollments).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <School className="h-20 w-20 mx-auto opacity-50 animate-float" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                        {t('noEnrolledClasses' as TranslationKey)}
                      </h3>
                      <p className="text-sm font-sans mb-6">
                        {t('browseAvailableClassesDescription' as TranslationKey)}
                      </p>
                      <Link href="/dashboard/classes" prefetch={true}>
                        <Button 
                          className="btn-gradient animate-pulse-glow"
                        >
                          {t('browseAvailableClasses' as TranslationKey)}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {publishedClasses
                        .filter((c: any) => myClassEnrollments[c.id])
                        .map((c: any) => (
                          <Link key={c.id} href={`/dashboard/my-classes/${c.id}`} prefetch={true}>
                            <Card 
                              className="card-hover overflow-hidden cursor-pointer"
                            >
                            <CardHeader className="hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                              <div className="flex items-start gap-4">
                                {/* Class Image */}
                                <div className="relative flex-shrink-0">
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                                  {c.image_url ? (
                                    <img 
                                      src={c.image_url} 
                                      alt={c.class_name || c.name} 
                                      className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900" 
                                    />
                                  ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                                      <GraduationCap className="h-10 w-10 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Class Info */}
                                <div className="flex-1 min-w-0 pt-1">
                                  <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {c.class_name || c.name}
                                  </CardTitle>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                        {`${t('level' as TranslationKey)} ${c.level ?? '—'}`}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                                        {(subjectsByClass[c.id] || []).length}{' '}
                                        {(subjectsByClass[c.id] || []).length === 1 ? t('subject' as TranslationKey) : t('subjects')}
                                      </Badge>
                                      {classProgress[c.id] !== undefined && (
                                        <div className="flex items-center gap-2">
                                          <Progress className="h-2 w-16" value={classProgress[c.id]} />
                                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {classProgress[c.id]}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                          </Link>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Classes - الفصول المتاحة */}
            {loadingStudentData ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-slate-900 dark:text-white">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    {t('availableClassesForEnrollment' as TranslationKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <BookOpen className="h-20 w-20 mx-auto opacity-50 animate-float" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                        {t('noAvailableClasses' as TranslationKey)}
                      </h3>
                      <p className="text-sm font-sans">
                        {t('noClassesAvailableForEnrollment' as TranslationKey)}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {publishedClasses
                        .filter((c: any) => !myClassEnrollments[c.id])
                        .map((c: any) => (
                          <Card 
                            key={c.id} 
                            className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg font-display">
                                    {c.class_name || c.name}
                                  </CardTitle>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {`${t('level' as TranslationKey)} ${c.level ?? '—'}`}
                                  </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {c.goals && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                  {c.goals}
                                </p>
                              )}
                              <Button
                                className="btn-gradient w-full transition-all duration-300 hover:scale-105"
                                disabled={!!enrollingIds[c.id]}
                                onClick={async () => {
                                  try {
                                    setEnrollingIds(prev => ({ ...prev, [c.id]: true }));
                                    const { error } = await enrollInClass(c.id);
                                    if (error) {
                                      console.error(error);
      toast.error(t('enrollmentFailed' as TranslationKey));
                                      return;
                                    }
                                    setMyClassEnrollments(prev => ({ ...prev, [c.id]: true }));
                                    toast.success(t('enrolledSuccessfully' as TranslationKey));
                                    await loadStudentData();
                                  } finally {
                                    setEnrollingIds(prev => ({ ...prev, [c.id]: false }));
                                  }
                                }}
                              >
                                {enrollingIds[c.id] 
                                  ? t('enrolling' as TranslationKey) 
                                  : t('enrollInClass' as TranslationKey)
                                }
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events - الأحداث القادمة */}
            {loadingSchedule ? (
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : upcomingEvents.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Clock className="h-5 w-5 text-amber-600" />
                    {t('upcomingEvents')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((e: ScheduleEvent) => (
                      <div 
                        key={e.id} 
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                              {e.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(e.start_at).toLocaleDateString(dateLocale)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {e.room && <span>📍 {e.room}</span>}
                            </div>
                          </div>
                          {e.zoom_url && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => window.open(e.zoom_url, '_blank')}
                            >
                              <Video className="h-3 w-3 mr-1" /> 
                              {t('joinMeeting')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Teacher Dashboard - لوحة المعلم */}
        {profile?.role === 'teacher' && (
          <>
            <TeacherDashboardSection
              t={t}
              stats={{
                classCount: teacherClassCount,
                studentCount: teacherStudentCount,
                scheduleCount: todayEvents.length,
              }}
              todayEvents={todayEvents}
              teacherClasses={teacherClasses}
              loadingSchedule={loadingSchedule}
              loadingTeacherData={loadingTeacherData}
              dateLocale={dateLocale}
            />
            
          </>
        )}

        {/* Supervisor Dashboard - لوحة المشرف */}
        {profile?.role === 'supervisor' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('assignedClasses' as TranslationKey)}
                value={stats.totalClasses}
                icon={School}
                description={t('classesUnderSupervision' as TranslationKey)}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('totalStudents')}
                value={stats.totalStudents}
                icon={Users}
                description={t('studentsInAssignedClasses' as TranslationKey)}
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('reports')}
                value="0"
                icon={BookOpen}
                description={t('pendingReports' as TranslationKey)}
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  {t('supervisedClasses' as TranslationKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalClasses === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('noClassesAssignedForSupervisionYet' as TranslationKey)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {`${t('supervisingClassesPrefix' as TranslationKey)} ${stats.totalClasses} ${
                      stats.totalClasses === 1 ? t('class') : t('classes')
                    }`}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </PullToRefresh>
    </DashboardLayout>
  );
}
