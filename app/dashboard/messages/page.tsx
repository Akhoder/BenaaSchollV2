'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingInline, SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, ExternalLink, Send, MessageSquare, CheckCircle, Clock, Users, School, Link as LinkIcon, Plus, Loader2, ArrowRight, Eye } from 'lucide-react';
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
        <SimplePageLoading text={t('loading')} />
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

        {/* ✨ Stats Cards - Islamic Design */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 animate-fade-in-up">
          {/* Total Messages */}
          <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('totalMessages')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-display">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('messages')}</p>
            </CardContent>
          </Card>

          {/* Unread Messages */}
          <Card className="glass-card-hover border-primary/10 hover:border-warning/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('unreadMessages')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-warning to-warning/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Bell className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning font-display">{stats.unread}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('status')}</p>
            </CardContent>
          </Card>

          {/* Read Messages */}
          <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('readMessages')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success font-display">{stats.read}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('completed')}</p>
            </CardContent>
          </Card>

          {/* Today Messages */}
          <Card className="glass-card-hover border-primary/10 hover:border-info/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('todayMessages')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-info to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info font-display">{stats.today}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('todayMessages')}</p>
            </CardContent>
          </Card>
        </div>

        {/* ✨ Send Notification Card - Islamic Design */}
        {canSend && (
          <Card className="glass-card border-primary/10 overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-primary">
                  <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  {t('sendNotification')}
                </CardTitle>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                  className="shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newMessage')}
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* ✨ Messages List - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden animate-fade-in-up delay-200">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-warning to-warning/80 rounded-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <span className="text-primary font-display">{t('messagesAndAlerts')} ({items.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8">
                <LoadingInline text={t('loadingMessages')} size="default" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                {/* Empty State - Enhanced Design */}
                <div className="relative inline-block mb-6">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                    <Bell className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  {t('noMessages')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('noMessagesDescription')}
                </p>
                
                {/* Decorative Line */}
                <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {items.map((n, index) => (
                  <div 
                    key={n.id} 
                    className={`
                      p-4 rounded-xl border transition-all duration-200 animate-fade-in-up group
                      ${n.read_at 
                        ? 'glass-card border-primary/10' 
                        : 'border-warning/30 bg-gradient-to-r from-warning/5 to-warning/10 shadow-md ring-1 ring-warning/20'
                      }
                      hover:shadow-xl hover:scale-[1.01]
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {!n.read_at && (
                            <Badge variant="warning" className="gap-1">
                              <Bell className="h-3 w-3" />
                              {t('new' as TranslationKey)}
                            </Badge>
                          )}
                          <h4 className="font-semibold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {n.title}
                          </h4>
                        </div>
                        {n.body && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>{new Date(n.created_at).toLocaleString(dateLocale)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.read_at && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onRead(n.id)}
                            className="h-8 text-xs border-success/30 text-success hover:bg-success/10"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('markAsRead')}
                          </Button>
                        )}
                        {n.link_url && n.link_url.trim() && (() => {
                          let url = n.link_url.trim();
                          
                          // Check if it's a full URL with the same origin (internal link with full URL)
                          try {
                            const currentOrigin = window.location.origin;
                            const urlObj = new URL(url, currentOrigin);
                            
                            // If it's the same origin, extract the pathname and use it as internal link
                            if (urlObj.origin === currentOrigin) {
                              url = urlObj.pathname + urlObj.search + urlObj.hash;
                            }
                          } catch (e) {
                            // If URL parsing fails, treat as relative path
                          }
                          
                          const isInternal = url.startsWith('/') || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('tel:'));
                          
                          if (isInternal) {
                            // Internal link - use router.push for proper navigation
                            // Ensure it starts with / for proper routing
                            const internalPath = url.startsWith('/') ? url : `/${url}`;
                            
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    // Mark as read when opening internal link
                                    if (!n.read_at) {
                                      await onRead(n.id);
                                    }
                                    // Navigate to the exact path
                                    router.push(internalPath);
                                  } catch (error) {
                                    console.error('Error opening link:', error);
                                    toast.error(t('errorOpeningLink'));
                                  }
                                }}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                {t('view')}
                              </Button>
                            );
                          } else {
                            // External link - open in new tab
                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    let finalUrl = url;
                                    // Add protocol if missing
                                    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('tel:')) {
                                      finalUrl = `https://${finalUrl}`;
                                    }
                                    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                    if (!newWindow) {
                                      toast.error(t('popupBlocked'));
                                    } else {
                                      // Mark as read when opening external link
                                      if (!n.read_at) {
                                        await onRead(n.id);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error opening link:', error);
                                    toast.error(t('errorOpeningLink'));
                                  }
                                }}
                                className="h-8 text-xs border-info/30 text-info hover:bg-info/10"
                                type="button"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {t('view')}
                              </Button>
                            );
                          }
                        })()}
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
