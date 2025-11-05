'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { Certificate, CertificateStatus, CertificateGrade } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Award, CheckCircle, XCircle, Eye, Printer, Download, FileCheck, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';

export default function SubjectCertificatesPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.subjectId as string) || '';
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Record<string, { full_name?: string; email?: string }>>({});
  const [subjectName, setSubjectName] = useState<string>('');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingAutoPublish, setUpdatingAutoPublish] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'issue' | 'publish' | 'unpublish' | 'create' | null>(null);
  const [updating, setUpdating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{ id: string; full_name?: string; email?: string }>>([]);
  const [createForm, setCreateForm] = useState({
    student_id: '',
    final_score: '',
    grade: '' as CertificateGrade | '',
    status: 'draft' as CertificateStatus,
  });
  const [creating, setCreating] = useState(false);

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
    if (subjectId && profile) {
      void loadData();
      void loadEnrolledStudents();
    }
  }, [subjectId, profile]);

  const loadEnrolledStudents = async () => {
    try {
      const { data, error } = await api.fetchEnrolledStudentsForSubject(subjectId);
      if (error) {
        console.error(error);
        return;
      }
      setEnrolledStudents((data || []) as Array<{ id: string; full_name?: string; email?: string }>);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load subject name and auto_publish setting
      const { data: subject } = await supabase
        .from('class_subjects')
        .select('subject_name, auto_publish_certificates')
        .eq('id', subjectId)
        .single();
      
      if (subject) {
        setSubjectName(subject.subject_name);
        setAutoPublishEnabled(subject.auto_publish_certificates || false);
      }

      // Load certificates
      const { data: certs, error } = await api.fetchCertificatesForSubject(subjectId);
      if (error) {
        console.error(error);
        toast.error('Error loading certificates');
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
    } catch (err) {
      console.error(err);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (certId: string, newStatus: CertificateStatus) => {
    try {
      setUpdating(true);
      const { error } = await api.updateCertificateStatus(certId, newStatus);
      if (error) {
        toast.error('Failed to update status');
        return;
      }
      toast.success('Status updated');
      setDialogOpen(false);
      setSelectedCert(null);
      setAction(null);
      await loadData();
    } catch (err) {
      toast.error('Error updating status');
    } finally {
      setUpdating(false);
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

  const getGradeBadge = (grade: CertificateGrade, score: number) => {
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
    const matchesSearch = !search || 
      (students[cert.student_id]?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (cert.certificate_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
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
              {(t('certificates') as any) || 'Certificates'} - {subjectName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {(t('manageCertificates') as any) || 'Manage certificates for this subject'}
            </p>
          </div>
          <Button
            className="btn-gradient"
            onClick={() => {
              setCreateDialogOpen(true);
              setAction('create');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {(t('issueNewCertificate') as any) || 'Issue New Certificate'}
          </Button>
        </div>

        {/* Auto-Publish Settings */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient flex items-center gap-2">
              <Award className="h-5 w-5" />
              {(t('certificateSettings') as any) || 'Certificate Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-base font-medium mb-2 block">
                  {(t('autoPublishCertificates') as any) || 'Auto-Publish Certificates'}
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {(t('autoPublishDescription') as any) || 'When enabled, certificates will be automatically published (visible to students) immediately after they complete all lessons and quizzes. When disabled, certificates will be created as draft and require manual approval.'}
                </p>
              </div>
              <div className="ml-4">
                <Switch
                  checked={autoPublishEnabled}
                  onCheckedChange={async (checked) => {
                    try {
                      setUpdatingAutoPublish(true);
                      const { error } = await supabase
                        .from('class_subjects')
                        .update({ auto_publish_certificates: checked })
                        .eq('id', subjectId);
                      
                      if (error) {
                        toast.error('Failed to update setting');
                        return;
                      }
                      
                      setAutoPublishEnabled(checked);
                      toast.success(
                        checked 
                          ? ((t('autoPublishEnabled') as any) || 'Auto-publish enabled')
                          : ((t('autoPublishDisabled') as any) || 'Auto-publish disabled')
                      );
                    } catch (err) {
                      toast.error('Error updating setting');
                    } finally {
                      setUpdatingAutoPublish(false);
                    }
                  }}
                  disabled={updatingAutoPublish}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="card-elegant">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Input
                  placeholder={(t('search') as any) || 'Search by student name or certificate number...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-modern"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="input-modern">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{(t('all') as any) || 'All'}</SelectItem>
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
              {(t('certificatesList') as any) || 'Certificates List'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCertificates.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Award className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {(t('noCertificates') as any) || 'No certificates yet'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {(t('certificatesWillAppear') as any) || 'Certificates will appear here when students complete all lessons and quizzes'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{(t('student') as any) || 'Student'}</TableHead>
                    <TableHead>{(t('certificateNumber') as any) || 'Certificate #'}</TableHead>
                    <TableHead>{(t('grade') as any) || 'Grade'}</TableHead>
                    <TableHead>{(t('status') as any) || 'Status'}</TableHead>
                    <TableHead>{(t('completionDate') as any) || 'Completion Date'}</TableHead>
                    <TableHead>{(t('actions') as any) || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => {
                    const student = students[cert.student_id] || {};
                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {student.full_name || cert.student_id}
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
                          {new Date(cert.completion_date).toLocaleDateString()}
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
                            {cert.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setAction('issue');
                                  setDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            {cert.status === 'issued' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setAction('publish');
                                  setDialogOpen(true);
                                }}
                              >
                                <FileCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {cert.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setAction('unpublish');
                                  setDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
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

        {/* Status Change Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'issue' && ((t('issueCertificate') as any) || 'Issue Certificate')}
                {action === 'publish' && ((t('publishCertificate') as any) || 'Publish Certificate')}
                {action === 'unpublish' && ((t('unpublishCertificate') as any) || 'Unpublish Certificate')}
              </DialogTitle>
              <DialogDescription>
                {action === 'issue' && ((t('issueCertificateConfirm') as any) || 'Are you sure you want to issue this certificate?')}
                {action === 'publish' && ((t('publishCertificateConfirm') as any) || 'Are you sure you want to publish this certificate? The student will be able to view it.')}
                {action === 'unpublish' && ((t('unpublishCertificateConfirm') as any) || 'Are you sure you want to unpublish this certificate? The student will no longer be able to view it.')}
              </DialogDescription>
            </DialogHeader>
            {selectedCert && (
              <div className="space-y-2 py-4">
                <p className="text-sm">
                  <span className="font-medium">{(t('student') as any) || 'Student'}:</span>{' '}
                  {students[selectedCert.student_id]?.full_name || selectedCert.student_id}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{(t('certificateNumber') as any) || 'Certificate #'}:</span>{' '}
                  {selectedCert.certificate_number}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{(t('grade') as any) || 'Grade'}:</span>{' '}
                  {selectedCert.grade} ({selectedCert.final_score.toFixed(1)})
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedCert(null); setAction(null); }}>
                {(t('cancel') as any) || 'Cancel'}
              </Button>
              <Button
                className="btn-gradient"
                onClick={() => {
                  if (!selectedCert) return;
                  if (action === 'issue') {
                    void handleStatusChange(selectedCert.id, 'issued');
                  } else if (action === 'publish') {
                    void handleStatusChange(selectedCert.id, 'published');
                  } else if (action === 'unpublish') {
                    void handleStatusChange(selectedCert.id, 'issued');
                  }
                }}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {(t('saving') as any) || 'Saving...'}
                  </>
                ) : (
                  <>
                    {action === 'issue' && ((t('issue') as any) || 'Issue')}
                    {action === 'publish' && ((t('publish') as any) || 'Publish')}
                    {action === 'unpublish' && ((t('unpublish') as any) || 'Unpublish')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Certificate Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {(t('issueNewCertificate') as any) || 'Issue New Certificate'}
              </DialogTitle>
              <DialogDescription>
                {(t('issueNewCertificateDescription') as any) || 'Create a new certificate for a student in this subject'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">
                  {(t('student') as any) || 'Student'} *
                </Label>
                <Select
                  value={createForm.student_id}
                  onValueChange={(value) => setCreateForm({ ...createForm, student_id: value })}
                >
                  <SelectTrigger className="input-modern mt-1">
                    <SelectValue placeholder={(t('selectStudent') as any) || 'Select student'} />
                  </SelectTrigger>
                  <SelectContent>
                    {enrolledStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name || student.email || student.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {(t('finalScore') as any) || 'Final Score'} (0-100) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={createForm.final_score}
                  onChange={(e) => {
                    const score = parseFloat(e.target.value) || 0;
                    let grade: CertificateGrade = 'راسب';
                    if (score >= 90) grade = 'ممتاز';
                    else if (score >= 80) grade = 'جيد جداً';
                    else if (score >= 70) grade = 'جيد';
                    else if (score >= 60) grade = 'مقبول';
                    setCreateForm({ ...createForm, final_score: e.target.value, grade });
                  }}
                  className="input-modern mt-1"
                  placeholder="0-100"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {(t('grade') as any) || 'Grade'} *
                </Label>
                <Select
                  value={createForm.grade}
                  onValueChange={(value) => setCreateForm({ ...createForm, grade: value as CertificateGrade })}
                >
                  <SelectTrigger className="input-modern mt-1">
                    <SelectValue placeholder={(t('selectGrade') as any) || 'Select grade'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ممتاز">ممتاز</SelectItem>
                    <SelectItem value="جيد جداً">جيد جداً</SelectItem>
                    <SelectItem value="جيد">جيد</SelectItem>
                    <SelectItem value="مقبول">مقبول</SelectItem>
                    <SelectItem value="راسب">راسب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {(t('status') as any) || 'Status'} *
                </Label>
                <Select
                  value={createForm.status}
                  onValueChange={(value) => setCreateForm({ ...createForm, status: value as CertificateStatus })}
                >
                  <SelectTrigger className="input-modern mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      {(t('draft') as any) || 'Draft'} - {(t('notVisibleToStudent') as any) || 'Not visible to student'}
                    </SelectItem>
                    <SelectItem value="issued">
                      {(t('issued') as any) || 'Issued'} - {(t('approvedButNotVisible') as any) || 'Approved but not visible'}
                    </SelectItem>
                    <SelectItem value="published">
                      {(t('published') as any) || 'Published'} - {(t('visibleToStudent') as any) || 'Visible to student'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {(t('statusHint') as any) || 'Select "Published" to make the certificate visible to the student immediately'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreateForm({ student_id: '', final_score: '', grade: '', status: 'draft' });
                }}
              >
                {(t('cancel') as any) || 'Cancel'}
              </Button>
              <Button
                className="btn-gradient"
                onClick={async () => {
                  if (!createForm.student_id || !createForm.final_score || !createForm.grade) {
                    toast.error((t('fillAllFields') as any) || 'Please fill all fields');
                    return;
                  }
                  try {
                    setCreating(true);
                    const { error } = await api.createCertificateManually(
                      createForm.student_id,
                      subjectId,
                      parseFloat(createForm.final_score),
                      createForm.grade,
                      createForm.status
                    );
                    if (error) {
                      toast.error('Failed to create certificate');
                      return;
                    }
                    toast.success(
                      createForm.status === 'published' 
                        ? ((t('certificateCreatedAndPublished') as any) || 'Certificate created and published successfully')
                        : ((t('certificateCreated') as any) || 'Certificate created successfully')
                    );
                    setCreateDialogOpen(false);
                    setCreateForm({ student_id: '', final_score: '', grade: '', status: 'draft' });
                    await loadData();
                  } catch (err) {
                    toast.error('Error creating certificate');
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating || !createForm.student_id || !createForm.final_score || !createForm.grade || !createForm.status}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {(t('creating') as any) || 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {(t('create') as any) || 'Create'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

