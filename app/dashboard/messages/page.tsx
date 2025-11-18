'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingInline } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, ExternalLink, Send, MessageSquare, CheckCircle, Clock, Users, School, Link as LinkIcon, Plus, Loader2 } from 'lucide-react';
import { fetchMyNotifications, markNotificationRead, createNotification, supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  body?: string;
  link_url?: string;
  created_at: string;
  read_at?: string;
  type?: string;
}

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', body: '', link_url: '', class_id: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dateLocale = useMemo(
    () => (language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US'),
    [language]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/login');
      return;
    }
    loadData().catch(() => {});
    if (['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      loadClasses().catch(() => {});
    }
  }, [authLoading, profile, router]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchMyNotifications(50);
      if (error) {
        toast.error(t('failedToLoadMessages'));
        return;
      }
      setItems(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('classes').select('id, class_name').order('class_name');
      if (error) {
        console.error('Error loading classes:', error);
        return;
      }
      setClasses(data || []);
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  }, []);

  const onRead = useCallback(async (id: string) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return;
    if (items[idx].read_at) return;
    const { error } = await markNotificationRead(id);
    if (!error) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
      toast.success(t('markedAsRead'));
    } else {
      toast.error(t('errorOccurred'));
    }
  }, [items, t]);

  const onSend = useCallback(async () => {
    try {
      if (!form.title.trim()) {
        toast.error(t('titleRequired'));
        return;
      }
      setSending(true);
      const payload: any = {
        title: form.title,
        body: form.body || null,
        link_url: form.link_url || null,
        class_id: form.class_id || null,
        recipient_id: null,
        role_target: form.class_id ? null : 'student',
        type: 'info',
      };
      const { error } = await createNotification(payload);
      if (error) {
        toast.error(t('sendFailed'));
        return;
      }
      toast.success(t('messageSent'));
      setForm({ title: '', body: '', link_url: '', class_id: '' });
      setIsDialogOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('errorOccurred'));
    } finally {
      setSending(false);
    }
  }, [form, loadData, t]);

  const stats = useMemo(() => {
    const unread = items.filter(n => !n.read_at).length;
    const today = items.filter(n => {
      const date = new Date(n.created_at);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length;
    return {
      total: items.length,
      unread,
      today,
      read: items.length - unread,
    };
  }, [items]);

  const canSend = ['admin', 'teacher', 'supervisor'].includes(profile?.role || '');

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingInline text={t('loading')} size="default" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={MessageSquare}
          title={t('messages')}
          description={t('messagesDescription')}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 animate-fade-in-up">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('totalMessages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('unreadMessages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-600">{stats.unread}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {t('readMessages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.read}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('todayMessages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.today}</div>
            </CardContent>
          </Card>
        </div>

        {/* Send Notification Card (for admins/teachers) */}
        {canSend && (
          <Card className="card-hover glass-strong">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  {t('sendNotification')}
                </CardTitle>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newMessage')}
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Messages List */}
        <Card className="card-hover glass-strong animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              {t('messagesAndAlerts')} ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <LoadingInline text={t('loadingMessages')} size="default" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <Bell className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noMessages')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {t('noMessagesDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((n) => (
                  <div 
                    key={n.id} 
                    className={`
                      p-4 rounded-xl border transition-all duration-200
                      ${n.read_at 
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50' 
                        : 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 shadow-md'
                      }
                      hover:shadow-lg hover:scale-[1.01]
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {!n.read_at && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              {t('new' as TranslationKey)}
                            </Badge>
                          )}
                          <h4 className="font-semibold font-sans text-base line-clamp-1">
                            {n.title}
                          </h4>
                        </div>
                        {n.body && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-3">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(n.created_at).toLocaleString(dateLocale)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.read_at && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onRead(n.id)}
                            className="h-8 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('markAsRead')}
                          </Button>
                        )}
                        {n.link_url && n.link_url.trim() && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (n.link_url && n.link_url.trim()) {
                                try {
                                  let url = n.link_url.trim();
                                  
                                  // Check if it's an internal link (starts with /)
                                  if (url.startsWith('/')) {
                                    // Internal link - use router
                                    router.push(url);
                                  } else {
                                    // External link - add protocol if missing and open in new tab
                                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                      url = `https://${url}`;
                                    }
                                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                                    if (!newWindow) {
                                      toast.error(t('popupBlocked'));
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error opening link:', error);
                                  toast.error(t('errorOpeningLink'));
                                }
                              }
                            }}
                            className="h-8 text-xs"
                            type="button"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {t('open')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Notification Dialog */}
        {canSend && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  {t('sendNotification')}
                </DialogTitle>
                <DialogDescription className="font-sans">
                  {t('sendNotificationDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div>
                  <Label className="text-sm font-sans flex items-center gap-2">
                    {t('title')} *
                  </Label>
                  <Input 
                    value={form.title} 
                    onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    className="mt-1 input-modern" 
                    placeholder={t('messageTitlePlaceholder')}
                  />
                </div>
                <div>
                  <Label className="text-sm font-sans">{t('body' as TranslationKey)}</Label>
                  <Textarea 
                    value={form.body} 
                    onChange={(e) => setForm({ ...form, body: e.target.value })} 
                    className="mt-1 input-modern min-h-[100px]" 
                    placeholder={t('messageBodyPlaceholder')}
                  />
                </div>
                <div>
                  <Label className="text-sm font-sans flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    {t('link' as TranslationKey)}
                  </Label>
                  <Input 
                    value={form.link_url} 
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })} 
                    placeholder="https://..." 
                    className="mt-1 input-modern" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-sans flex items-center gap-2">
                    <School className="h-4 w-4" />
                    {t('classOptional')}
                  </Label>
                  <Select 
                    value={form.class_id || 'ALL'} 
                    onValueChange={(v) => setForm({ ...form, class_id: v === 'ALL' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('allStudents')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t('allStudents')}</SelectItem>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={onSend} 
                  disabled={sending || !form.title.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('send' as TranslationKey)}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
