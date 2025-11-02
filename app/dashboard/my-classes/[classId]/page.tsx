'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  School, 
  BookOpen, 
  Loader2, 
  GraduationCap, 
  ArrowLeft,
  CheckCircle,
  CircleCheck,
  CircleDot,
  ArrowRight,
  User
} from 'lucide-react';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass, getSubjectProgressStats } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ClassViewPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const classId = (params?.classId as string) || '';

  const [classData, setClassData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Record<string, any>>({});
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
    if (profile?.role === 'student' && classId) {
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router, classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes to find the one we need
      const { data: myClasses, error: cErr } = await fetchMyEnrolledClassesWithDetails();
      if (cErr) {
        console.error(cErr);
        toast.error('Error loading class');
        return;
      }
      
      const selectedClass = (myClasses || []).find((c: any) => c.id === classId);
      if (!selectedClass) {
        toast.error('Class not found');
        router.push('/dashboard/my-classes');
        return;
      }
      
      setClassData(selectedClass);

      // Load subjects for this class
      const { data: subjectsData } = await fetchSubjectsForClass(classId);
      const subjectsList = (subjectsData || []) as any[];
      setSubjects(subjectsList);

      // Load progress for each subject
      const progressMap: Record<string, any> = {};
      for (const subject of subjectsList) {
        const { data: progress } = await getSubjectProgressStats(subject.id);
        if (progress) {
          progressMap[subject.id] = progress;
        }
      }
      setSubjectProgress(progressMap);
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
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student' || !classData) {
    return null;
  }

  const getCompletionColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress > 0) return 'bg-amber-500';
    return 'bg-gray-300 dark:bg-gray-700';
  };

  const getProgressLabel = (progress: any) => {
    if (!progress || progress.total_lessons === 0) {
      return { status: 'not_started', icon: CircleDot, text: 'Not Started' };
    }
    if (progress.completed_lessons === progress.total_lessons) {
      return { status: 'completed', icon: CircleCheck, text: 'Completed' };
    }
    if (progress.completed_lessons > 0 || progress.in_progress_lessons > 0) {
      return { status: 'in_progress', icon: CheckCircle, text: 'In Progress' };
    }
    return { status: 'not_started', icon: CircleDot, text: 'Not Started' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/my-classes')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>

        {/* Class Header */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/20 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white shadow-2xl">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
          }}></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>

          <div className="relative z-10">
            <div className="flex items-start gap-6">
              {/* Class Image */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                {classData.image_url ? (
                  <img src={classData.image_url} alt={classData.class_name} className="w-24 h-24 rounded-3xl object-cover relative border-4 border-white/30" />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 relative">
                    <GraduationCap className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Class Info */}
              <div className="flex-1 pt-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3 drop-shadow-lg">
                  {classData.class_name}
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Enrolled</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                      Level {classData.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">{subjects.length} Subjects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects List */}
        {subjects.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-sans">No subjects in this class yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {subjects.map((subject) => {
              const progress = subjectProgress[subject.id];
              const { status, icon: StatusIcon, text: statusText } = getProgressLabel(progress);
              const progressValue = progress?.overall_progress || 0;
              
              return (
                <Card
                  key={subject.id}
                  className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  onClick={() => router.push(`/dashboard/my-classes/${classId}/subjects/${subject.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Subject Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Subject Icon */}
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative border-2 border-blue-100 dark:border-blue-900">
                            <BookOpen className="h-8 w-8 text-white" />
                          </div>
                        </div>

                        {/* Subject Details */}
                        <div className="flex-1 min-w-0 pt-1">
                          <CardTitle className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {subject.subject_name}
                          </CardTitle>
                          
                          {/* Teacher Info */}
                          {subject.teacher?.full_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <User className="h-4 w-4" />
                              <span className="truncate">{subject.teacher.full_name}</span>
                            </div>
                          )}
                          
                          {progress && progress.total_lessons > 0 ? (
                            <div className="space-y-3">
                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon className={`h-4 w-4 ${
                                      status === 'completed' ? 'text-emerald-600' :
                                      status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {statusText}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {Math.round(progressValue)}%
                                  </span>
                                </div>
                                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getCompletionColor(progressValue)}`}
                                    style={{ width: `${progressValue}%` }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                  </div>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {progress.completed_lessons} Completed
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {progress.in_progress_lessons} In Progress
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {progress.not_started_lessons} Remaining
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <StatusIcon className="h-4 w-4" />
                              <span>No lessons yet</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 pt-2">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors">
                          <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
