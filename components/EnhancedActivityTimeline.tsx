'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Users, School, GraduationCap, BookOpen, Calendar, 
  UserPlus, FileText, Clock, Filter, TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'student_registered' | 'class_created' | 'teacher_added' | 'enrollment' | 'assignment_created';
  title: string;
  description?: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  href?: string;
}

interface GroupedActivity {
  date: string;
  label: string;
  activities: ActivityItem[];
}

// ✅ Helper function to create activity items (removes code duplication)
const createActivityItem = (
  id: string,
  type: ActivityItem['type'],
  title: string,
  timestamp: Date,
  icon: ActivityItem['icon'],
  color: string,
  bgColor: string,
  href?: string,
  description?: string
): ActivityItem => ({
  id,
  type,
  title,
  timestamp,
  icon,
  color,
  bgColor,
  href,
  description,
});

// ✅ Activity type configuration (removes duplication)
const ACTIVITY_CONFIG = {
  student_registered: {
    icon: UserPlus,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  class_created: {
    icon: School,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  teacher_added: {
    icon: GraduationCap,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  enrollment: {
    icon: Calendar,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  assignment_created: {
    icon: FileText,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
  },
};

export function EnhancedActivityTimeline() {
  const { language } = useLanguage();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [groupedActivities, setGroupedActivities] = useState<GroupedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const allActivities: ActivityItem[] = [];

        // ✅ Load all activity types in parallel
        const [
          recentStudents,
          recentClasses,
          recentTeachers,
          recentEnrollments,
          recentAssignments
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, created_at')
            .eq('role', 'student')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('classes')
            .select('id, class_name, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('id, full_name, created_at')
            .eq('role', 'teacher')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('student_enrollments')
            .select('id, created_at, class_id, student_id, classes(class_name), profiles!student_id(full_name)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assignments')
            .select('id, title, created_at, subjects(name)')
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        // ✅ Process students
        if (recentStudents.data) {
          const config = ACTIVITY_CONFIG.student_registered;
          recentStudents.data.forEach((student: any) => {
            allActivities.push(createActivityItem(
              `student-${student.id}`,
              'student_registered',
              language === 'ar' 
                ? `طالب جديد: ${student.full_name || 'غير معروف'}`
                : `New student: ${student.full_name || 'Unknown'}`,
              new Date(student.created_at),
              config.icon,
              config.color,
              config.bgColor,
              '/dashboard/students'
            ));
          });
        }

        // ✅ Process classes
        if (recentClasses.data) {
          const config = ACTIVITY_CONFIG.class_created;
          recentClasses.data.forEach((cls: any) => {
            allActivities.push(createActivityItem(
              `class-${cls.id}`,
              'class_created',
              language === 'ar' 
                ? `تم إنشاء فصل: ${cls.class_name || 'غير معروف'}`
                : `Class created: ${cls.class_name || 'Unknown'}`,
              new Date(cls.created_at),
              config.icon,
              config.color,
              config.bgColor,
              '/dashboard/classes'
            ));
          });
        }

        // ✅ Process teachers
        if (recentTeachers.data) {
          const config = ACTIVITY_CONFIG.teacher_added;
          recentTeachers.data.forEach((teacher: any) => {
            allActivities.push(createActivityItem(
              `teacher-${teacher.id}`,
              'teacher_added',
              language === 'ar' 
                ? `معلم جديد: ${teacher.full_name || 'غير معروف'}`
                : `New teacher: ${teacher.full_name || 'Unknown'}`,
              new Date(teacher.created_at),
              config.icon,
              config.color,
              config.bgColor,
              '/dashboard/teachers'
            ));
          });
        }

        // ✅ Process enrollments
        if (recentEnrollments.data) {
          const config = ACTIVITY_CONFIG.enrollment;
          recentEnrollments.data.forEach((enrollment: any) => {
            const className = enrollment.classes?.class_name || 'Unknown';
            const studentName = enrollment.profiles?.full_name || 'Unknown';
            allActivities.push(createActivityItem(
              `enrollment-${enrollment.id}`,
              'enrollment',
              language === 'ar' 
                ? `تسجيل جديد: ${studentName} في ${className}`
                : `New enrollment: ${studentName} in ${className}`,
              new Date(enrollment.created_at),
              config.icon,
              config.color,
              config.bgColor,
              '/dashboard/classes'
            ));
          });
        }

        // ✅ Process assignments
        if (recentAssignments.data) {
          const config = ACTIVITY_CONFIG.assignment_created;
          recentAssignments.data.forEach((assignment: any) => {
            const subjectName = assignment.subjects?.name || 'Unknown';
            allActivities.push(createActivityItem(
              `assignment-${assignment.id}`,
              'assignment_created',
              language === 'ar' 
                ? `واجب جديد: ${assignment.title || 'غير معروف'}`
                : `New assignment: ${assignment.title || 'Unknown'}`,
              new Date(assignment.created_at),
              config.icon,
              config.color,
              config.bgColor,
              '/dashboard/quizzes',
              language === 'ar' 
                ? `في مادة ${subjectName}`
                : `In ${subjectName}`
            ));
          });
        }

        // Sort by timestamp
        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(allActivities.slice(0, 10));
      } catch (err) {
        console.error('Error loading activities:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadActivities();
  }, [language]);

  // ✅ Group activities by date (memoized for performance)
  const filterTypes = useMemo(() => [
    { value: null, label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'student_registered', label: language === 'ar' ? 'طلاب' : 'Students' },
    { value: 'class_created', label: language === 'ar' ? 'فصول' : 'Classes' },
    { value: 'teacher_added', label: language === 'ar' ? 'معلمون' : 'Teachers' },
    { value: 'enrollment', label: language === 'ar' ? 'تسجيلات' : 'Enrollments' },
    { value: 'assignment_created', label: language === 'ar' ? 'واجبات' : 'Assignments' },
  ], [language]);

  useEffect(() => {
    const grouped: GroupedActivity[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const filtered = filter 
      ? activities.filter(a => a.type === filter)
      : activities;

    filtered.forEach((activity) => {
      const activityDate = new Date(activity.timestamp);
      activityDate.setHours(0, 0, 0, 0);
      
      let groupLabel = '';
      let dateKey = '';
      
      if (activityDate.getTime() === today.getTime()) {
        groupLabel = language === 'ar' ? 'اليوم' : 'Today';
        dateKey = 'today';
      } else if (activityDate.getTime() === yesterday.getTime()) {
        groupLabel = language === 'ar' ? 'أمس' : 'Yesterday';
        dateKey = 'yesterday';
      } else if (activityDate.getTime() >= weekAgo.getTime()) {
        const daysAgo = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
        groupLabel = language === 'ar' 
          ? `منذ ${daysAgo} ${daysAgo === 1 ? 'يوم' : 'أيام'}`
          : `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
        dateKey = `week-${daysAgo}`;
      } else {
        groupLabel = activityDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: activityDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
        dateKey = activityDate.toISOString().slice(0, 10);
      }

      let group = grouped.find(g => g.date === dateKey);
      if (!group) {
        group = { date: dateKey, label: groupLabel, activities: [] };
        grouped.push(group);
      }
      group.activities.push(activity);
    });

    setGroupedActivities(grouped);
  }, [activities, filter, language]);

  const formatTimeAgo = (date: Date): string => {
    return formatDistanceToNow(date, { addSuffix: true, locale: language === 'ar' ? ar : enUS });
  };

  if (loading) {
    return (
      <Card className="glass-card-hover border-0 shadow-xl">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-hover border-0 shadow-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {language === 'ar' ? 'النشاط الحديث' : 'Recent Activity'}
            </span>
          </CardTitle>
          
          {/* ✅ Improved Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterTypes.map((type) => (
              <Button
                key={type.value || 'all'}
                variant={filter === type.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(type.value)}
                className={cn(
                  "h-8 text-xs font-medium transition-all duration-200",
                  filter === type.value 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "hover:bg-muted/50"
                )}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {groupedActivities.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-muted/50 rounded-2xl mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedActivities.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* ✅ Enhanced Date Header */}
                <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 -mx-2 px-2 rounded-lg">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <Badge 
                    variant="outline" 
                    className="text-xs font-semibold px-3 py-1 bg-muted/50 border-border/50"
                  >
                    {group.label}
                  </Badge>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                {/* ✅ Enhanced Timeline */}
                <div className="relative pl-8 space-y-5">
                  {/* Timeline Line with gradient */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/50 to-primary/30 rounded-full" />
                  
                  {group.activities.map((activity) => {
                    const Icon = activity.icon;
                    const config = ACTIVITY_CONFIG[activity.type];
                    
                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "relative flex items-start gap-4 group",
                          "hover:bg-muted/30 rounded-xl p-4 -ml-4 transition-all duration-200",
                          "border border-transparent hover:border-border/50"
                        )}
                      >
                        {/* ✅ Enhanced Timeline Dot */}
                        <div className={cn(
                          "absolute left-0 top-6 w-6 h-6 rounded-full z-10",
                          "border-2 border-background shadow-lg",
                          "flex items-center justify-center",
                          config.bgColor,
                          "group-hover:scale-110 transition-transform duration-200"
                        )}>
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            config.color.replace('text-', 'bg-')
                          )} />
                        </div>

                        {/* ✅ Enhanced Activity Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {activity.href ? (
                                <Link
                                  href={activity.href}
                                  className="block group/link"
                                  prefetch={true}
                                >
                                  <p className={cn(
                                    "text-sm font-semibold text-foreground line-clamp-1",
                                    "group-hover/link:text-primary transition-colors duration-200"
                                  )}>
                                    {activity.title}
                                  </p>
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold text-foreground line-clamp-1">
                                  {activity.title}
                                </p>
                              )}
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                                  {activity.description}
                                </p>
                              )}
                              <time className="text-xs text-muted-foreground/70 mt-2 block">
                                {formatTimeAgo(activity.timestamp)}
                              </time>
                            </div>
                            <div className={cn(
                              "flex items-center gap-2 flex-shrink-0",
                              "p-2 rounded-lg",
                              config.bgColor,
                              "border",
                              config.borderColor
                            )}>
                              <Icon className={cn("w-4 h-4", config.color)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
