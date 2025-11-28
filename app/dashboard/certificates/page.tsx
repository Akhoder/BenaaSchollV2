'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import * as api from '@/lib/supabase';
import type { Certificate, CertificateStatus } from '@/lib/supabase';
import { toast } from 'sonner';
import { Award, Eye, Search, FileText, BookOpen, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
      draft: { label: 'Draft', variant: 'gold' as const, icon: Clock },
      issued: { label: 'Issued', variant: 'info' as const, icon: FileText },
      published: { label: 'Published', variant: 'success' as const, icon: CheckCircle2 },
    };
    const cfg = config[status] || config.draft;
    const Icon = cfg.icon;
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={cfg.variant} className="gap-1.5">
          <Icon className="h-3 w-3" />
          {cfg.label}
        </Badge>
        {autoIssued && (
          <Badge variant="islamic" className="text-xs">
            {(t('auto') as any) || 'Auto'}
          </Badge>
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
      const gradeConfig: Record<GradeKey, { variant: 'success' | 'info' | 'warning' | 'gold' | 'destructive' | 'islamic' }> = {
        gradeExcellent: { variant: 'success' },
        gradeVeryGood: { variant: 'info' },
        gradeGood: { variant: 'warning' },
        gradeAcceptable: { variant: 'gold' },
        gradeFail: { variant: 'destructive' },
        gradeOther: { variant: 'islamic' },
      };
      const cfg = gradeConfig[gradeKey] || gradeConfig.gradeOther;
      return (
        <Badge variant={cfg.variant} className="font-semibold">
          {t(gradeKey as TranslationKey)} ({score.toFixed(1)})
        </Badge>
      );
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

  // ✅ Calculate stats
  const stats = useMemo(() => {
    const total = certificates.length;
    const published = certificates.filter(c => c.status === 'published').length;
    const issued = certificates.filter(c => c.status === 'issued').length;
    const draft = certificates.filter(c => c.status === 'draft').length;
    const autoIssued = certificates.filter(c => c.auto_issued).length;
    
    return { total, published, issued, draft, autoIssued };
  }, [certificates]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <PageLoading
          text={t('loading')}
          statsCount={4}
          contentType="table"
          contentRows={6}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* ✨ Enhanced Header with Islamic Design */}
        <PageHeader
          icon={Award}
          title={t('certificates')}
          description={t('manageAllCertificates')}
        />

        {/* ✨ Stats Cards - Islamic Design */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
          {/* Total Certificates */}
          <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('certificates')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-display">
                {stats.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('certificates')}
              </p>
            </CardContent>
          </Card>

          {/* Published Certificates */}
          <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('published')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success font-display">
                {stats.published}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('published')}
              </p>
            </CardContent>
          </Card>

          {/* Issued Certificates */}
          <Card className="glass-card-hover border-primary/10 hover:border-secondary/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('issued')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary font-display">
                {stats.issued}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('issued')}
              </p>
            </CardContent>
          </Card>

          {/* Auto Issued */}
          <Card className="glass-card-hover border-primary/10 hover:border-accent/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('auto')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent font-display">
                {stats.autoIssued}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auto')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ✨ Search and Filter Card - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-primary/10 rounded-lg group-focus-within:bg-primary/20 transition-colors">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <Input
                    placeholder={(t('searchCertificates') as any) || 'Search by student, subject, or certificate number...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-14 h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
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

        {/* ✨ Certificates Table - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="font-display text-primary">
                {t('certificatesList')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCertificates.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                {/* Empty State - Enhanced Design */}
                <div className="relative inline-block mb-6">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                    <Award className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  {t('noCertificates')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('certificatesWillAppear')}
                </p>
                
                {/* Decorative Line */}
                <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10 hover:bg-gradient-to-l hover:from-primary/10 hover:to-secondary/10">
                      <TableHead className="font-bold text-foreground">{t('student')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('subject')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('certificateNumber')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('grade')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('status')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('completionDate')}</TableHead>
                      <TableHead className="font-bold text-foreground text-center">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCertificates.map((cert, index) => {
                      const student = students[cert.student_id] || {};
                      const subject = subjects[cert.subject_id] || {};
                      return (
                        <TableRow 
                          key={cert.id} 
                          className="hover:bg-primary/5 border-b border-border/50 transition-all duration-200 animate-fade-in-up group"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Student with Avatar */}
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-2 ring-secondary/30 group-hover:ring-primary/50 transition-all">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                                  {(student.full_name || cert.student_id).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">
                                  {student.full_name || cert.student_id}
                                </span>
                                {student.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {student.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Subject */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-accent/10 rounded-lg">
                                <BookOpen className="h-4 w-4 text-accent" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {subject.subject_name || cert.subject_id}
                                </span>
                                {subject.class_name && (
                                  <span className="text-xs text-muted-foreground">
                                    {subject.class_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Certificate Number */}
                          <TableCell>
                            <code className="px-2 py-1 bg-primary/5 border border-primary/20 rounded-lg text-sm font-mono text-primary">
                              {cert.certificate_number}
                            </code>
                          </TableCell>

                          {/* Grade */}
                          <TableCell>
                            {getGradeBadge(cert.grade, cert.final_score)}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {getStatusBadge(cert.status, cert.auto_issued)}
                          </TableCell>

                          {/* Completion Date */}
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">
                                {new Date(cert.completion_date).toLocaleDateString(dateLocale)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/certificates/${cert.id}/view`)}
                                className="hover:bg-primary/10 hover:text-primary transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/subjects/${cert.subject_id}/certificates`)}
                                className="hover:bg-accent/10 hover:text-accent transition-all"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

