'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { Certificate } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Award, Eye, Search, Calendar, Sparkles, CheckCircle } from 'lucide-react';
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
    const gradeConfig: Record<string, { variant: any; icon?: any }> = {
      'ممتاز': { variant: 'success', icon: CheckCircle },
      'جيد جداً': { variant: 'info', icon: CheckCircle },
      'جيد': { variant: 'warning', icon: CheckCircle },
      'مقبول': { variant: 'accent', icon: CheckCircle },
      'راسب': { variant: 'destructive', icon: null },
    };
    const cfg = gradeConfig[grade] || { variant: 'default', icon: null };
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {grade} ({score.toFixed(1)})
      </Badge>
    );
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
        <SimplePageLoading text={t('loading')} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={Award}
          title={t('myCertificates')}
          description={t('viewYourCertificates')}
          gradient="from-secondary to-accent"
        />

        {/* Search */}
        <Card className="glass-card border-primary/10 animate-fade-in-up">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                <Search className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-foreground">{t('searchCertificates')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-modern pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Eligible Subjects (Can Issue Certificate) */}
        {eligibleSubjects.length > 0 && (
          <Card className="glass-card border-secondary/30 bg-gradient-to-l from-secondary/5 to-accent/5 animate-fade-in-up">
            <CardHeader className="bg-gradient-to-l from-secondary/10 to-accent/10 border-b border-secondary/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-lg animate-pulse">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="font-display text-foreground">{t('eligibleForCertificates')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {eligibleSubjects.map((item, index) => {
                  const eligibility = item.eligibility || {};
                  return (
                    <div
                      key={item.subject_id}
                      className="flex items-center justify-between p-4 glass-card border-secondary/30 hover:border-secondary/50 transition-all animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-3 text-foreground">{item.subject_name}</h3>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="info" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t('lessonsCompleted')}: {eligibility.lessons_completed || 0} / {eligibility.lessons_total || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="accent" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t('quizzesGraded')}: {eligibility.quizzes_graded || 0} / {eligibility.quizzes_total || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="gold" className="gap-1">
                              <Award className="h-3 w-3" />
                              {t('finalScore')}: {eligibility.final_score ? parseFloat(eligibility.final_score).toFixed(1) : '0.0'} / 100
                              {' - '}
                              {eligibility.grade || '-'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="default"
                        className="ml-4 transition-all duration-300 hover:scale-105"
                        onClick={() => handleIssueCertificate(item.subject_id, item.subject_name)}
                        disabled={issuing === item.subject_id}
                      >
                        {issuing === item.subject_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('issuing')}
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4 mr-2" />
                            {t('issueCertificate')}
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
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              
              <div className="text-center animate-fade-in relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl border border-secondary/20">
                    <Award className="h-16 w-16 mx-auto text-secondary animate-float" />
                  </div>
                </div>
                <div className="w-24 h-1 bg-gradient-to-l from-transparent via-secondary to-transparent mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-foreground font-display mb-2">
                  {t('noCertificates')}
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  {t('completeLessonsAndQuizzes')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
            {filteredCertificates.map((cert, index) => {
              const subjectName = subjects[cert.subject_id]?.subject_name || '';
              return (
                <Card key={cert.id} className="glass-card-hover border-secondary/30 overflow-hidden group" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardHeader className="bg-gradient-to-l from-secondary/5 to-accent/5 border-b border-secondary/10 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative p-2.5 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-lg">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-display font-semibold line-clamp-2 mb-2 text-foreground group-hover:text-secondary transition-colors">
                          {subjectName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getGradeBadge(cert.grade, cert.final_score)}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          <span className="font-semibold">{t('certificateNumber')}:</span> {cert.certificate_number}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="h-4 w-4 text-secondary flex-shrink-0" />
                        <span>
                          <span className="font-semibold">{t('finalScore')}:</span>{' '}
                          {cert.final_score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>
                          <span className="font-semibold">{t('completionDate')}:</span>{' '}
                          {new Date(cert.completion_date).toLocaleDateString('ar-LB', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      className="w-full transition-all duration-300 hover:scale-105"
                      onClick={() => router.push(`/dashboard/certificates/${cert.id}/view`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('viewCertificate')}
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

