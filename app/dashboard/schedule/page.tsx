'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';
import { LoadingInline } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Edit, Clock, MapPin, Users, School, Video, Link as LinkIcon, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ScheduleEvent {
  id: string;
  title: string;
  class_id?: string;
  teacher_id?: string;
  start_at: string;
  end_at: string;
  room?: string;
  notes?: string;
  recurrence_rule?: string;
  recurrence_end_at?: string;
  mode: 'in_person' | 'online' | 'hybrid';
  zoom_url?: string;
  class_name?: string;
  teacher_name?: string;
}

interface FormData {
  title: string;
  class_id: string;
  teacher_id: string;
  start_at: string;
  end_at: string;
  room: string;
  notes: string;
  recurrence_rule: string;
  recurrence_end_at: string;
  mode: 'in_person' | 'online' | 'hybrid';
  zoom_url: string;
}

export default function SchedulePage() {
  const { profile, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filters, setFilters] = useState({ class_id: '', teacher_id: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);
  const [form, setForm] = useState<FormData>({
    title: '',
    class_id: '',
    teacher_id: '',
    start_at: '',
    end_at: '',
    room: '',
    notes: '',
    recurrence_rule: 'NONE',
    recurrence_end_at: '',
    mode: 'in_person',
    zoom_url: ''
  });
  const [loadingData, setLoadingData] = useState(false);

  // Fetch classes and teachers
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          supabase.from('classes').select('id, class_name').order('created_at', { ascending: false }),
          supabase.rpc('get_all_profiles')
        ]);
        if (!cRes.error && cRes.data) setClasses(cRes.data);
        if (!tRes.error && tRes.data) {
          setTeachers((tRes.data as any[]).filter((p) => p.role === 'teacher'));
        }
      } catch (err) {
        console.error('Error loading classes/teachers:', err);
        toast.error(t('errorOccurred'));
      }
    })();
  }, [profile, t]);

  // Fetch events for week
  useEffect(() => {
    if (!profile) return;
    setLoadingData(true);
    const start = new Date(weekStart);
    const end = addDays(start, 7);
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_events', { p_start: start.toISOString(), p_end: end.toISOString() });
        if (error) {
          console.error(error);
          toast.error(t('failedToLoadSchedule'));
          return;
        }
        const classNameById: Record<string, string> = {};
        classes.forEach((c: any) => { classNameById[c.id] = c.class_name; });
        const teacherNameById: Record<string, string> = {};
        teachers.forEach((t: any) => { teacherNameById[t.id] = t.full_name; });
        const enriched = (data || []).map((e: any) => ({
          ...e,
          class_name: e.class_name || (e.class_id ? classNameById[e.class_id] : undefined),
          teacher_name: e.teacher_name || (e.teacher_id ? teacherNameById[e.teacher_id] : undefined),
        }));
        const expanded = expandRecurringEvents(enriched, start, end);
        setEvents(expanded);
      } catch (err) {
        console.error('Error loading events:', err);
        toast.error(t('failedToLoadSchedule'));
      } finally {
        setLoadingData(false);
      }
    })();
  }, [profile, weekStart, classes, teachers, t]);

  const resetForm = useCallback(() => {
    setForm({
      title: '',
      class_id: '',
      teacher_id: '',
      start_at: '',
      end_at: '',
      room: '',
      notes: '',
      recurrence_rule: 'NONE',
      recurrence_end_at: '',
      mode: 'in_person',
      zoom_url: ''
    });
  }, []);

  const onEdit = useCallback((e: ScheduleEvent) => {
    setSelected(e);
    setForm({
      title: e.title || '',
      class_id: e.class_id || '',
      teacher_id: e.teacher_id || '',
      start_at: toLocalInput(e.start_at),
      end_at: toLocalInput(e.end_at),
      room: e.room || '',
      notes: e.notes || '',
      recurrence_rule: e.recurrence_rule || 'NONE',
      recurrence_end_at: e.recurrence_end_at ? toLocalDate(e.recurrence_end_at) : '',
      mode: e.mode || 'in_person',
      zoom_url: e.zoom_url || '',
    });
    setIsDialogOpen(true);
  }, []);

  const onDelete = useCallback(async (id: string) => {
    try {
      const prev = events;
      setEvents(prev.filter((x) => x.id !== id));
      const { error } = await supabase.from('schedule_events').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('eventDeleted'));
    } catch (e) {
      console.error(e);
      toast.error(t('deleteFailed'));
      setEvents(events);
    }
  }, [events, t]);

  const onSave = useCallback(async () => {
    if (!profile) return;
    try {
      const payload: any = {
        title: form.title,
        class_id: form.class_id || null,
        teacher_id: form.teacher_id || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        room: form.room || null,
        notes: form.notes || null,
        recurrence_rule: (form.recurrence_rule === 'NONE') ? null : form.recurrence_rule,
        mode: form.mode,
        zoom_url: form.zoom_url || null,
      };
      if (form.recurrence_end_at) {
        payload.recurrence_end_at = new Date(`${form.recurrence_end_at}T23:59:59`).toISOString();
      }
      if (selected) {
        const { error } = await supabase.from('schedule_events').update(payload).eq('id', selected.id);
        if (error) throw error;
        setEvents((prev) => prev.map((x) => x.id === selected.id ? { ...x, ...payload } : x));
        toast.success(t('eventUpdated'));
      } else {
        const insert = { ...payload, created_by: profile!.id };
        const { data, error } = await supabase.from('schedule_events').insert(insert).select('*').single();
        if (error) throw error;
        setEvents((prev) => [{ ...data }, ...prev]);
        toast.success(t('eventCreated'));
      }
      setIsDialogOpen(false);
      setSelected(null);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error(t('saveFailed'));
    }
  }, [profile, form, selected, resetForm, t]);

  const filteredEventsList = useMemo(() => {
    return filteredEvents(events, filters);
  }, [events, filters]);

  const weekDays = useMemo(() => {
    return getWeekDays(weekStart);
  }, [weekStart]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = filteredEventsList.filter((e) => {
      const eventDate = new Date(e.start_at);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });
    const upcomingEvents = filteredEventsList.filter((e) => new Date(e.start_at) > new Date());
    const onlineEvents = filteredEventsList.filter((e) => e.mode === 'online' || e.mode === 'hybrid');
    return {
      total: filteredEventsList.length,
      today: todayEvents.length,
      upcoming: upcomingEvents.length,
      online: onlineEvents.length,
    };
  }, [filteredEventsList]);

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  if (loading) {
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
          icon={Calendar}
          title={t('schedule')}
          description={t('scheduleDescription')}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 animate-fade-in-up">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('totalEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('todayEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.today}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('upcomingEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.upcoming}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Video className="h-4 w-4" />
                {t('onlineEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.online}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-hover glass-strong">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                {t('weekView')}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  aria-label={t('previousWeek')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 py-1.5 text-sm font-sans bg-slate-100 dark:bg-slate-800 rounded-md">
                  {formatRange(weekStart)}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  aria-label={t('nextWeek')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {profile?.role !== 'student' && (
                  <Button 
                    onClick={() => { 
                      setSelected(null); 
                      resetForm(); 
                      setIsDialogOpen(true); 
                    }}
                    className="ml-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addEvent')}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Filters 
              classes={classes} 
              teachers={teachers} 
              filters={filters} 
              onChange={setFilters}
              t={t}
            />
            {loadingData ? (
              <div className="py-8">
                <LoadingInline text={t('loadingEvents')} size="default" />
              </div>
            ) : (
              <WeekTable 
                days={weekDays} 
                events={filteredEventsList} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                canEdit={profile?.role !== 'student'}
                t={t}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {selected ? t('editEvent') : t('addEvent')}
              </DialogTitle>
              <DialogDescription className="font-sans">
                {t('manageScheduleEvent')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  {t('title')} *
                </Label>
                <Input 
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  className="mt-1 input-modern" 
                  placeholder={t('eventTitlePlaceholder')}
                />
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('room' as TranslationKey)}
                </Label>
                <Input 
                  value={form.room} 
                  onChange={(e) => setForm({ ...form, room: e.target.value })} 
                  className="mt-1 input-modern" 
                  placeholder={t('roomPlaceholder')}
                />
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <School className="h-4 w-4" />
                  {t('class')}
                </Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('teacher')}
                </Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectTeacher')} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('start' as TranslationKey)} *
                </Label>
                <Input 
                  type="datetime-local" 
                  value={form.start_at} 
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })} 
                  className="mt-1 input-modern" 
                />
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('end' as TranslationKey)} *
                </Label>
                <Input 
                  type="datetime-local" 
                  value={form.end_at} 
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })} 
                  className="mt-1 input-modern" 
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-sans">{t('notes')}</Label>
                <Input 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  className="mt-1 input-modern" 
                  placeholder={t('notesOptional')}
                />
              </div>
              <div>
                <Label className="text-sm font-sans">{t('recurrence')}</Label>
                <Select value={form.recurrence_rule} onValueChange={(v) => setForm({ ...form, recurrence_rule: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('none' as TranslationKey)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t('none' as TranslationKey)}</SelectItem>
                    <SelectItem value="RRULE:FREQ=DAILY">{t('daily')}</SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY">{t('weekly')}</SelectItem>
                    <SelectItem value="RRULE:FREQ=MONTHLY">{t('monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans">{t('recurrenceEndOptional')}</Label>
                <Input 
                  type="date" 
                  value={form.recurrence_end_at} 
                  onChange={(e) => setForm({ ...form, recurrence_end_at: e.target.value })} 
                  className="mt-1 input-modern" 
                />
              </div>
              <div>
                <Label className="text-sm font-sans flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {t('mode' as TranslationKey)}
                </Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v as any })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">{t('inPerson')}</SelectItem>
                    <SelectItem value="online">{t('online')}</SelectItem>
                    <SelectItem value="hybrid">{t('hybrid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-sans flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {t('zoomUrlOptional')}
                </Label>
                <Input 
                  value={form.zoom_url} 
                  onChange={(e) => setForm({ ...form, zoom_url: e.target.value })} 
                  placeholder="https://zoom.us/j/..." 
                  className="mt-1 input-modern" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={onSave} 
                disabled={!form.title || !form.start_at || !form.end_at}
              >
                {selected ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Helper functions
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatRange(start: Date): string {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toLocalInput(dateString: string): string {
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toLocalDate(dateString: string): string {
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// Expand recurring events
function expandRecurringEvents(events: ScheduleEvent[], rangeStart: Date, rangeEnd: Date): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];
  for (const e of events) {
    const baseStart = new Date(e.start_at);
    const baseEnd = new Date(e.end_at);
    const recurEnd = e.recurrence_end_at ? new Date(e.recurrence_end_at) : null;
    const limitEnd = recurEnd && recurEnd < rangeEnd ? recurEnd : rangeEnd;
    const freq = parseFreq(e.recurrence_rule);
    if (!freq || freq === 'NONE') {
      if (overlaps(baseStart, baseEnd, rangeStart, limitEnd)) out.push(e);
      continue;
    }
    if (freq === 'DAILY') {
      for (let d = new Date(rangeStart); d < limitEnd; d = addDays(d, 1)) {
        const instStart = new Date(d);
        instStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
        const instEnd = new Date(d);
        instEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);
        out.push({ ...e, id: `${e.id}-D-${instStart.toISOString()}`, start_at: instStart.toISOString(), end_at: instEnd.toISOString() });
      }
    } else if (freq === 'WEEKLY') {
      const target = sameWeekday(rangeStart, baseStart.getDay());
      const instStart = new Date(target);
      instStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const instEnd = new Date(target);
      instEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);
      if (overlaps(instStart, instEnd, rangeStart, limitEnd)) {
        out.push({ ...e, id: `${e.id}-W-${instStart.toISOString()}`, start_at: instStart.toISOString(), end_at: instEnd.toISOString() });
      }
    } else if (freq === 'MONTHLY') {
      const dom = baseStart.getDate();
      for (let d = new Date(rangeStart); d < limitEnd; d = addDays(d, 1)) {
        if (d.getDate() === dom) {
          const instStart = new Date(d);
          instStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          const instEnd = new Date(d);
          instEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);
          out.push({ ...e, id: `${e.id}-M-${instStart.toISOString()}`, start_at: instStart.toISOString(), end_at: instEnd.toISOString() });
        }
      }
    }
  }
  return out;
}

function parseFreq(rrule?: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE' | undefined {
  if (!rrule || rrule === 'NONE') return 'NONE';
  if (rrule.includes('FREQ=DAILY')) return 'DAILY';
  if (rrule.includes('FREQ=WEEKLY')) return 'WEEKLY';
  if (rrule.includes('FREQ=MONTHLY')) return 'MONTHLY';
  return 'NONE';
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function sameWeekday(weekStart: Date, weekday: number): Date {
  const d = new Date(weekStart);
  const offsetFromMonday = (weekday + 6) % 7;
  return addDays(d, offsetFromMonday);
}

function filteredEvents(events: ScheduleEvent[], filters: { class_id: string; teacher_id: string }): ScheduleEvent[] {
  const isAll = (v: string) => v === '' || v === 'ALL';
  return events.filter((e) => 
    (isAll(filters.class_id) || e.class_id === filters.class_id) && 
    (isAll(filters.teacher_id) || e.teacher_id === filters.teacher_id)
  );
}

interface FiltersProps {
  classes: any[];
  teachers: any[];
  filters: { class_id: string; teacher_id: string };
  onChange: (filters: { class_id: string; teacher_id: string }) => void;
  t: (key: TranslationKey) => string;
}

function Filters({ classes, teachers, filters, onChange, t }: FiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <div className="w-full md:w-64">
        <Label className="text-sm font-sans flex items-center gap-2">
          <School className="h-4 w-4" />
          {t('class')}
        </Label>
        <Select value={filters.class_id} onValueChange={(v) => onChange({ ...filters, class_id: v })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all')}</SelectItem>
            {classes.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.class_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-64">
        <Label className="text-sm font-sans flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t('teacher')}
        </Label>
        <Select value={filters.teacher_id} onValueChange={(v) => onChange({ ...filters, teacher_id: v })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all')}</SelectItem>
            {teachers.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface WeekTableProps {
  days: Date[];
  events: ScheduleEvent[];
  onEdit: (e: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  t: (key: TranslationKey) => string;
}

function WeekTable({ days, events, onEdit, onDelete, canEdit, t }: WeekTableProps) {
  const dayEvents = useCallback((d: Date) => {
    return events.filter((e) => new Date(e.start_at).toDateString() === d.toDateString());
  }, [events]);

  const getEventColor = (mode: string) => {
    switch (mode) {
      case 'online':
        return 'border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20';
      case 'hybrid':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 md:gap-4">
      {days.map((d: Date, index: number) => {
        const isTodayDate = isToday(d);
        const eventsForDay = dayEvents(d);
        
        return (
          <div 
            key={d.toISOString()} 
            className={`
              border rounded-xl p-3 md:p-4 transition-all duration-200
              ${isTodayDate 
                ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 shadow-md' 
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
              }
              hover:shadow-lg hover:scale-[1.02]
            `}
          >
            <div className={`
              text-sm font-semibold mb-3 font-display flex items-center justify-between
              ${isTodayDate ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}
            `}>
              <span className="text-xs uppercase tracking-wider">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className={`
                px-2 py-0.5 rounded-md text-xs font-bold
                ${isTodayDate 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }
              `}>
                {d.getDate()}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-sans">
              {d.toLocaleDateString(undefined, { month: 'short' })}
            </div>
            <div className="space-y-2 min-h-[100px]">
              {eventsForDay.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                  {t('noEvents')}
                </div>
              )}
              {eventsForDay.map((e: ScheduleEvent) => (
                <div 
                  key={e.id} 
                  className={`
                    p-2.5 rounded-lg border transition-all duration-200
                    ${getEventColor(e.mode)}
                    hover:shadow-md hover:scale-[1.02]
                    overflow-hidden
                  `}
                >
                  <div className="text-sm font-semibold font-sans line-clamp-1">
                    {e.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1.5">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(e.start_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(e.end_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {(e.class_name || e.room || e.teacher_name) && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                      {[e.class_name, e.room, e.teacher_name].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {e.mode === 'online' && e.zoom_url && (
                    <a 
                      href={e.zoom_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mt-1.5 font-medium"
                    >
                      <Video className="h-3 w-3" />
                      {t('joinMeeting')}
                    </a>
                  )}
                  {canEdit && (
                    <div className="flex flex-col gap-1.5 mt-2.5">
                      <div className="flex gap-1.5 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onEdit(e)}
                          className="h-7 text-xs px-2 flex-1 min-w-0"
                        >
                          <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{t('edit')}</span>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => onDelete(e.id)}
                          className="h-7 text-xs px-2 flex-1 min-w-0"
                        >
                          <Trash2 className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{t('delete')}</span>
                        </Button>
                      </div>
                      {e.class_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const dateStr = new Date(e.start_at).toISOString().slice(0, 10);
                            window.location.href = `/dashboard/attendance?classId=${e.class_id}&date=${dateStr}`;
                          }}
                          className="h-7 text-xs px-2 w-full"
                        >
                          <span className="truncate">{t('recordAttendance')}</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
