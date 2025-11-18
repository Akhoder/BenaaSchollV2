'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import * as api from '@/lib/supabase';
import type { Certificate, CertificateStatus } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Award, Eye, Search, FileText, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CertificatesPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Record<string, { full_name?: string; email?: string }>>({});
  const [subjects, setSubjects] = useState<Record<string, { subject_name?: string; class_name?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const dateLocale = useMemo(() => (language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US'), [language]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile && ['admin', 'teacher', 'supervisor'].includes(profile.role || '')) {
      void loadCertificates();
    }
  }, [profile]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      
      // Load all certificates
      let query = supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by teacher if role is teacher
      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      }
      
      const { data: certs, error } = await query;
      if (error) {
        console.error(error);
        toast.error(t('errorLoadingCertificates'));
        return;
      }
      
      setCertificates((certs || []) as Certificate[]);
      
      // Load student names
      const studentIds = Array.from(new Set((certs || []).map((c: any) => c.student_id)));
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);
        
        const studentMap: Record<string, { full_name?: string; email?: string }> = {};
        (profiles || []).forEach((p: any) => {
          studentMap[p.id] = { full_name: p.full_name, email: p.email };
        });
        setStudents(studentMap);
      }
      
      // Load subject names and class names
      const subjectIds = Array.from(new Set((certs || []).map((c: any) => c.subject_id)));
      if (subjectIds.length > 0) {
        const { data: subjectData } = await supabase
          .from('class_subjects')
          .select('id, subject_name, class_id, classes(class_name)')
          .in('id', subjectIds);
        
        const subjectMap: Record<string, { subject_name?: string; class_name?: string }> = {};
        (subjectData || []).forEach((s: any) => {
          subjectMap[s.id] = { 
            subject_name: s.subject_name,
            class_name: s.classes?.class_name || ''
          };
        });
        setSubjects(subjectMap);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('errorLoadingCertificates'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: CertificateStatus, autoIssued: boolean) => {
    const config = {
      draft: { label: t('draft') || 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      issued: { label: t('issued') || 'Issued', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      published: { label: t('published') || 'Published', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    };
    const cfg = config[status] || config.draft;
    return (
      <div className="flex items-center gap-2">
        <Badge className={cfg.className}>{cfg.label}</Badge>
        {autoIssued && (
          <Badge variant="outline" className="text-xs">{(t('auto') as any) || 'Auto'}</Badge>
        )}
      </div>
    );
  };

  const getGradeBadge = (grade: string, score: number) => {
      type GradeKey = 'gradeExcellent' | 'gradeVeryGood' | 'gradeGood' | 'gradeAcceptable' | 'gradeFail' | 'gradeOther';
      const gradeKey: GradeKey = (() => {
        switch (grade) {
          case 'ممتاز':
            return 'gradeExcellent';
          case 'جيد جداً':
            return 'gradeVeryGood';
          case 'جيد':
            return 'gradeGood';
          case 'مقبول':
            return 'gradeAcceptable';
          case 'راسب':
            return 'gradeFail';
          default:
            return 'gradeOther';
        }
      })();
      const gradeConfig: Record<GradeKey, { className: string }> = {
        gradeExcellent: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
        gradeVeryGood: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
        gradeGood: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
        gradeAcceptable: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
        gradeFail: { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
        gradeOther: { className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      };
      const cfg = gradeConfig[gradeKey] || gradeConfig.gradeOther;
      return <Badge className={cfg.className}>{t(gradeKey as TranslationKey)} ({score.toFixed(1)})</Badge>;
  };

  const filteredCertificates = certificates.filter(cert => {
    const studentName = students[cert.student_id]?.full_name || '';
    const subjectName = subjects[cert.subject_id]?.subject_name || '';
    const matchesSearch = !search || 
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      subjectName.toLowerCase().includes(search.toLowerCase()) ||
      (cert.certificate_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
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
              {t('certificates')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('manageAllCertificates')}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="card-elegant">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={(t('searchCertificates') as any) || 'Search by student, subject, or certificate number...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-modern pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="input-modern">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="draft">{(t('draft') as any) || 'Draft'}</SelectItem>
                  <SelectItem value="issued">{(t('issued') as any) || 'Issued'}</SelectItem>
                  <SelectItem value="published">{(t('published') as any) || 'Published'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">
              {t('certificatesList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCertificates.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Award className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noCertificates')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {t('certificatesWillAppear')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('student')}</TableHead>
                    <TableHead>{t('subject')}</TableHead>
                    <TableHead>{t('certificateNumber')}</TableHead>
                    <TableHead>{t('grade')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('completionDate')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => {
                    const student = students[cert.student_id] || {};
                    const subject = subjects[cert.subject_id] || {};
                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {student.full_name || cert.student_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-slate-400" />
                            <span>{subject.subject_name || cert.subject_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cert.certificate_number}
                        </TableCell>
                        <TableCell>
                          {getGradeBadge(cert.grade, cert.final_score)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(cert.status, cert.auto_issued)}
                        </TableCell>
                        <TableCell>
                    {new Date(cert.completion_date).toLocaleDateString(dateLocale)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/certificates/${cert.id}/view`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/subjects/${cert.subject_id}/certificates`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

