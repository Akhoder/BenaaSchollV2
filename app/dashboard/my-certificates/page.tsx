'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { Certificate } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Award, Eye, Search, FileText, Download as DownloadIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MyCertificatesPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [subjects, setSubjects] = useState<Record<string, { subject_name?: string }>>({});
  const [eligibleSubjects, setEligibleSubjects] = useState<Array<{ subject_id: string; subject_name: string; eligibility: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [issuing, setIssuing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile && profile.role === 'student') {
      void loadCertificates();
      void loadEligibleSubjects();
    }
  }, [profile]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      
      // Load certificates for student
      const { data: certs, error } = await api.fetchCertificatesForStudent();
      if (error) {
        console.error(error);
        toast.error('Error loading certificates');
        return;
      }
      
      setCertificates((certs || []) as Certificate[]);
      
      // Load subject names
      const subjectIds = Array.from(new Set((certs || []).map((c: any) => c.subject_id)));
      if (subjectIds.length > 0) {
        const { data: subjectData } = await supabase
          .from('class_subjects')
          .select('id, subject_name')
          .in('id', subjectIds);
        
        const subjectMap: Record<string, { subject_name?: string }> = {};
        (subjectData || []).forEach((s: any) => {
          subjectMap[s.id] = { subject_name: s.subject_name };
        });
        setSubjects(subjectMap);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleSubjects = async () => {
    try {
      const { data, error } = await api.checkEligibleSubjectsForStudent();
      if (error) {
        console.error(error);
        return;
      }
      setEligibleSubjects((data || []) as Array<{ subject_id: string; subject_name: string; eligibility: any }>);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueCertificate = async (subjectId: string, subjectName: string) => {
    try {
      setIssuing(subjectId);
      const { data, error } = await api.studentIssueCertificate(subjectId);
      if (error) {
        toast.error((t('failedToIssueCertificate') as any) || 'Failed to issue certificate');
        return;
      }
      toast.success((t('certificateIssuedSuccessfully') as any) || 'Certificate issued successfully!');
      // Reload certificates and eligible subjects
      await loadCertificates();
      await loadEligibleSubjects();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error issuing certificate');
    } finally {
      setIssuing(null);
    }
  };

  const getGradeBadge = (grade: string, score: number) => {
    const gradeConfig: Record<string, { className: string }> = {
      'ممتاز': { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      'جيد جداً': { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      'جيد': { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      'مقبول': { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
      'راسب': { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    };
    const cfg = gradeConfig[grade] || { className: 'bg-slate-100 text-slate-700' };
    return <Badge className={cfg.className}>{grade} ({score.toFixed(1)})</Badge>;
  };

  const filteredCertificates = certificates.filter(cert => {
    const subjectName = subjects[cert.subject_id]?.subject_name || '';
    return !search || 
      subjectName.toLowerCase().includes(search.toLowerCase()) ||
      (cert.certificate_number || '').toLowerCase().includes(search.toLowerCase());
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 animate-fade-in">
          <div className="relative inline-block mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
            <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-3xl font-display text-gradient">
              {(t('myCertificates') as any) || 'My Certificates'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {(t('viewYourCertificates') as any) || 'View all your completion certificates'}
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="card-elegant">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={(t('searchCertificates') as any) || 'Search by subject name or certificate number...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-modern pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Eligible Subjects (Can Issue Certificate) */}
        {eligibleSubjects.length > 0 && (
          <Card className="card-elegant border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader>
              <CardTitle className="font-display text-gradient flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {(t('eligibleForCertificates') as any) || 'Eligible for Certificates'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eligibleSubjects.map((item) => {
                  const eligibility = item.eligibility || {};
                  return (
                    <div
                      key={item.subject_id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{item.subject_name}</h3>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          <p>
                            {(t('lessonsCompleted') as any) || 'Lessons'}: {eligibility.lessons_completed || 0} / {eligibility.lessons_total || 0}
                          </p>
                          <p>
                            {(t('quizzesGraded') as any) || 'Quizzes'}: {eligibility.quizzes_graded || 0} / {eligibility.quizzes_total || 0}
                          </p>
                          <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-2">
                            {(t('finalScore') as any) || 'Final Score'}: {eligibility.final_score ? parseFloat(eligibility.final_score).toFixed(1) : '0.0'} / 100
                            {' - '}
                            {eligibility.grade || '-'}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="btn-gradient ml-4"
                        onClick={() => handleIssueCertificate(item.subject_id, item.subject_name)}
                        disabled={issuing === item.subject_id}
                      >
                        {issuing === item.subject_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {(t('issuing') as any) || 'Issuing...'}
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4 mr-2" />
                            {(t('issueCertificate') as any) || 'Issue Certificate'}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificates Grid */}
        {filteredCertificates.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12">
              <div className="text-center animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Award className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {(t('noCertificates') as any) || 'No certificates yet'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {(t('completeLessonsAndQuizzes') as any) || 'Complete all lessons and quizzes to earn certificates'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((cert) => {
              const subjectName = subjects[cert.subject_id]?.subject_name || '';
              return (
                <Card key={cert.id} className="card-hover overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-display font-semibold line-clamp-2 mb-2">
                          {subjectName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getGradeBadge(cert.grade, cert.final_score)}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {(t('certificateNumber') as any) || 'Certificate #'}: {cert.certificate_number}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-amber-500 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p className="mb-1">
                        <span className="font-medium">{(t('finalScore') as any) || 'Final Score'}:</span>{' '}
                        {cert.final_score.toFixed(1)} / 100
                      </p>
                      <p>
                        <span className="font-medium">{(t('completionDate') as any) || 'Completion Date'}:</span>{' '}
                        {new Date(cert.completion_date).toLocaleDateString('ar-LB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      className="btn-gradient w-full"
                      onClick={() => router.push(`/dashboard/certificates/${cert.id}/view`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {(t('viewCertificate') as any) || 'View Certificate'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

