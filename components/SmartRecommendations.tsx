'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  FileText, 
  AlertCircle, 
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle,
  CircleDot
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass, getSubjectProgressStats, fetchMyAssignmentsForSubject } from '@/lib/supabase';

interface Recommendation {
  type: 'next_lesson' | 'due_assignment' | 'weak_subject' | 'recent_activity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  subjectName?: string;
}

export function SmartRecommendations() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations().catch(() => {});
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const recs: Recommendation[] = [];

      // Get enrolled classes
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setRecommendations([]);
        return;
      }

      // Get all subjects and their progress
      const subjectsMap: Record<string, any> = {};
      const allSubjects: any[] = [];
      
      for (const cls of classes) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        if (subjects) {
          allSubjects.push(...subjects);
          for (const subject of subjects) {
            subjectsMap[subject.id] = { ...subject, classId: cls.id };
          }
        }
      }

      // 1. Find next recommended lesson (in_progress or not_started)
      for (const subject of allSubjects) {
        const { data: progress } = await getSubjectProgressStats(subject.id);
        if (progress && progress.in_progress_lessons > 0) {
          recs.push({
            type: 'next_lesson',
            title: `Continue ${subject.subject_name}`,
            description: `${progress.in_progress_lessons} lesson${progress.in_progress_lessons > 1 ? 's' : ''} in progress`,
            priority: 'high',
            actionUrl: `/dashboard/my-classes/${subjectsMap[subject.id].classId}/subjects/${subject.id}`,
            subjectName: subject.subject_name
          });
          break; // Only show one
        }
      }

      // 2. Find due assignments
      const dueAssignments: any[] = [];
      for (const subject of allSubjects) {
        const { data: assignments } = await fetchMyAssignmentsForSubject(subject.id);
        if (assignments) {
          const now = new Date();
          for (const assignment of assignments) {
            if (assignment.due_date) {
              const dueDate = new Date(assignment.due_date);
              const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                dueAssignments.push({
                  ...assignment,
                  subjectName: subject.subject_name,
                  classId: subjectsMap[subject.id].classId,
                  daysUntilDue
                });
              }
            }
          }
        }
      }

      // Sort by urgency and add top 2
      dueAssignments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      dueAssignments.slice(0, 2).forEach(assignment => {
        recs.push({
          type: 'due_assignment',
          title: assignment.title,
          description: assignment.daysUntilDue === 0 ? 'Due today!' : `Due in ${assignment.daysUntilDue} day${assignment.daysUntilDue > 1 ? 's' : ''}`,
          priority: assignment.daysUntilDue === 0 ? 'high' : 'medium',
          actionUrl: `/dashboard/my-assignments`,
          subjectName: assignment.subjectName
        });
      });

      // 3. Find weak subjects (progress < 30%)
      for (const subject of allSubjects) {
        const { data: progress } = await getSubjectProgressStats(subject.id);
        if (progress && progress.total_lessons > 0 && progress.overall_progress < 30) {
          recs.push({
            type: 'weak_subject',
            title: `Focus on ${subject.subject_name}`,
            description: `Only ${Math.round(progress.overall_progress)}% complete`,
            priority: 'medium',
            actionUrl: `/dashboard/my-classes/${subjectsMap[subject.id].classId}/subjects/${subject.id}`,
            subjectName: subject.subject_name
          });
          if (recs.filter(r => r.type === 'weak_subject').length >= 1) break;
        }
      }

      setRecommendations(recs.slice(0, 3)); // Max 3 recommendations
    } catch (e) {
      console.error('Error loading recommendations:', e);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'next_lesson':
        return BookOpen;
      case 'due_assignment':
        return FileText;
      case 'weak_subject':
        return AlertCircle;
      default:
        return TrendingDown;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800';
      case 'medium':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800';
    }
  };

  if (loading) {
    return null;
  }

  if (recommendations.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-emerald-600" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            All caught up! No recommendations at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-emerald-600" />
          Smart Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => {
          const Icon = getIcon(rec.type);
          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              onClick={() => rec.actionUrl && router.push(rec.actionUrl)}
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${rec.type === 'next_lesson' ? 'from-blue-500 to-cyan-500' : rec.type === 'due_assignment' ? 'from-amber-500 to-orange-500' : 'from-red-500 to-pink-500'}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {rec.title}
                  </h4>
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {rec.description}
                </p>
                {rec.subjectName && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {rec.subjectName}
                  </p>
                )}
              </div>
              {rec.actionUrl && (
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

