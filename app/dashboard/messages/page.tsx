'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ExternalLink } from 'lucide-react';
import { fetchMyNotifications, markNotificationRead, createNotification, supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', body: '', link_url: '', class_id: '' });

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push('/login'); return; }
      loadData().catch(() => {});
      if (profile && ['admin','teacher','supervisor'].includes(profile.role)) {
        loadClasses().catch(() => {});
      }
    }
  }, [authLoading, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchMyNotifications(50);
      if (error) return;
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('id, class_name').order('class_name');
    setClasses(data || []);
  };

  const onRead = async (id: string) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return;
    if (items[idx].read_at) return;
    const { error } = await markNotificationRead(id);
    if (!error) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
    }
  };

  const onSend = async () => {
    try {
      if (!form.title.trim()) return;
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
      if (error) return;
      setForm({ title: '', body: '', link_url: '', class_id: '' });
      await loadData();
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }
  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {['admin','teacher','supervisor'].includes(profile.role) && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="text-sm">{language === 'ar' ? 'العنوان' : 'Title'}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm">{language === 'ar' ? 'المحتوى' : 'Body'}</Label>
                  <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Link</Label>
                  <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">{language === 'ar' ? 'الفصل (اختياري)' : 'Class (optional)'}</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'لكل الطلاب' : 'All students'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{language === 'ar' ? 'لكل الطلاب' : 'All students'}</SelectItem>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={onSend} disabled={sending || !form.title.trim()}>{sending ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال' : 'Send')}</Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              {language === 'ar' ? 'الرسائل والتنبيهات' : 'Messages & Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد رسائل' : 'No messages yet'}</p>
            ) : (
              <div className="space-y-2">
                {items.map((n) => (
                  <div key={n.id} className={`p-3 rounded-lg border ${n.read_at ? 'border-slate-200 dark:border-slate-800' : 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {!n.read_at && <Badge className="bg-amber-100 text-amber-700">{language === 'ar' ? 'جديد' : 'New'}</Badge>}
                          <h4 className="font-semibold">{n.title}</h4>
                        </div>
                        {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!n.read_at && (
                          <Button variant="outline" size="sm" onClick={() => onRead(n.id)}>{language === 'ar' ? 'تمييز كمقروء' : 'Mark as read'}</Button>
                        )}
                        {n.link_url && (
                          <Button variant="outline" size="sm" onClick={() => window.open(n.link_url, '_blank')}>
                            <ExternalLink className="h-3 w-3 mr-1" /> {language === 'ar' ? 'فتح' : 'Open'}
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
      </div>
    </DashboardLayout>
  );
}

