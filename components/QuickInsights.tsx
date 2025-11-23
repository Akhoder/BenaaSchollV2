'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Users, School, Award, AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    href: string;
  };
  count?: number;
}

// ✅ Insight type configuration (removes duplication)
const INSIGHT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
    hoverColor: 'hover:bg-warning/15',
  },
  success: {
    icon: TrendingUp,
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/20',
    hoverColor: 'hover:bg-success/15',
  },
  info: {
    icon: Users,
    bgColor: 'bg-info/10',
    textColor: 'text-info',
    borderColor: 'border-info/20',
    hoverColor: 'hover:bg-info/15',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-error/10',
    textColor: 'text-error',
    borderColor: 'border-error/20',
    hoverColor: 'hover:bg-error/15',
  },
};

export function QuickInsights() {
  const { language } = useLanguage();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        const newInsights: Insight[] = [];

        // ✅ Insight 1: Classes with low attendance
        const { data: classes } = await supabase
          .from('classes')
          .select('id, class_name');
        
        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const { data: attendance } = await supabase
            .from('attendance_records')
            .select('class_id, status')
            .in('class_id', classIds)
            .gte('attendance_date', weekAgo.toISOString().slice(0, 10));
          
          if (attendance) {
            const classAttendance: Record<string, { total: number; present: number }> = {};
            attendance.forEach((r: any) => {
              if (!classAttendance[r.class_id]) {
                classAttendance[r.class_id] = { total: 0, present: 0 };
              }
              classAttendance[r.class_id].total++;
              if (['present', 'late', 'excused'].includes(r.status)) {
                classAttendance[r.class_id].present++;
              }
            });
            
            const lowAttendanceClasses = Object.entries(classAttendance)
              .filter(([_, stats]) => {
                const rate = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                return rate < 70;
              })
              .slice(0, 3);
            
            if (lowAttendanceClasses.length > 0) {
              newInsights.push({
                id: 'low-attendance',
                type: 'warning',
                title: language === 'ar' 
                  ? `${lowAttendanceClasses.length} فصول تحتاج انتباه`
                  : `${lowAttendanceClasses.length} classes need attention`,
                description: language === 'ar'
                  ? 'معدل الحضور منخفض في هذه الفصول'
                  : 'Low attendance rate in these classes',
                icon: AlertTriangle,
                count: lowAttendanceClasses.length,
                action: {
                  label: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
                  href: '/dashboard/attendance'
                }
              });
            }
          }
        }

        // ✅ Insight 2: Students with low grades
        const { data: students } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'student')
          .limit(100);
        
        if (students && students.length > 0) {
          const studentIds = students.map(s => s.id);
          
          const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('student_id, score, total_points')
            .in('student_id', studentIds)
            .not('score', 'is', null);
          
          if (submissions && submissions.length > 0) {
            const studentScores: Record<string, number[]> = {};
            submissions.forEach((s: any) => {
              if (!studentScores[s.student_id]) {
                studentScores[s.student_id] = [];
              }
              if (s.total_points > 0) {
                const percentage = (s.score / s.total_points) * 100;
                studentScores[s.student_id].push(percentage);
              }
            });
            
            const lowPerformingStudents = Object.entries(studentScores)
              .filter(([_, scores]) => {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                return avg < 60;
              })
              .slice(0, 5);
            
            if (lowPerformingStudents.length > 0) {
              newInsights.push({
                id: 'low-grades',
                type: 'error',
                title: language === 'ar'
                  ? `${lowPerformingStudents.length} طلاب يحتاجون متابعة`
                  : `${lowPerformingStudents.length} students need follow-up`,
                description: language === 'ar'
                  ? 'درجات منخفضة - يحتاجون دعم إضافي'
                  : 'Low grades - need additional support',
                icon: AlertCircle,
                count: lowPerformingStudents.length,
                action: {
                  label: language === 'ar' ? 'عرض الطلاب' : 'View Students',
                  href: '/dashboard/students'
                }
              });
            }
          }
        }

        // ✅ Insight 3: Recent growth
        const { data: recentStudents } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        if (recentStudents && recentStudents.length > 0) {
          newInsights.push({
            id: 'recent-growth',
            type: 'success',
            title: language === 'ar'
              ? `+${recentStudents.length} طالب جديد هذا الشهر`
              : `+${recentStudents.length} new students this month`,
            description: language === 'ar'
              ? 'نمو إيجابي في عدد الطلاب'
              : 'Positive growth in student numbers',
            icon: TrendingUp,
            count: recentStudents.length
          });
        }

        // ✅ Insight 4: Active teachers
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: activeTeachers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'teacher')
          .gte('updated_at', weekAgo.toISOString())
          .limit(5);
        
        if (activeTeachers && activeTeachers.length > 0) {
          newInsights.push({
            id: 'active-teachers',
            type: 'info',
            title: language === 'ar'
              ? `${activeTeachers.length} معلم نشط هذا الأسبوع`
              : `${activeTeachers.length} active teachers this week`,
            description: language === 'ar'
              ? 'معلمون نشطون جداً'
              : 'Very active teachers',
            icon: Users,
            count: activeTeachers.length
          });
        }

        setInsights(newInsights.slice(0, 4));
      } catch (err) {
        console.error('Error loading insights:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadInsights();
  }, [language]);

  if (loading) {
    return (
      <Card className="glass-card-hover border-0 shadow-xl">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="glass-card-hover border-0 shadow-xl">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl backdrop-blur-sm">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {language === 'ar' ? 'رؤى سريعة' : 'Quick Insights'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-muted/50 rounded-2xl mb-4">
              <Award className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'لا توجد رؤى متاحة حالياً' : 'No insights available at the moment'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-hover border-0 shadow-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl backdrop-blur-sm">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {language === 'ar' ? 'رؤى سريعة' : 'Quick Insights'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {insights.map((insight) => {
            const Icon = insight.icon;
            const config = INSIGHT_CONFIG[insight.type];
            
            return (
              <div
                key={insight.id}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200",
                  config.bgColor,
                  config.borderColor,
                  config.hoverColor,
                  "hover:shadow-lg hover:scale-[1.02]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2.5 rounded-lg flex-shrink-0",
                    config.bgColor,
                    "border",
                    config.borderColor
                  )}>
                    <Icon className={cn("w-5 h-5", config.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className={cn("font-semibold text-sm", config.textColor)}>
                        {insight.title}
                      </h4>
                      {insight.count !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs px-2 py-0.5",
                            config.textColor,
                            config.borderColor
                          )}
                        >
                          {insight.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <Link
                        href={insight.action.href}
                        prefetch={true}
                        className={cn(
                          "text-xs font-medium inline-flex items-center gap-1",
                          "transition-colors duration-200",
                          config.textColor,
                          "hover:underline"
                        )}
                      >
                        {insight.action.label}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
