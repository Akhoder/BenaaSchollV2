'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SchedulePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filters, setFilters] = useState({ class_id: '', teacher_id: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', class_id: '', teacher_id: '', start_at: '', end_at: '', room: '', notes: '', recurrence_rule: 'NONE', recurrence_end_at: '', mode: 'in_person', zoom_url: '' });
  
  // fetch classes and teachers once
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [cRes, tRes] = await Promise.all([
        supabase.from('classes').select('id, class_name').order('created_at', { ascending: false }),
        supabase.rpc('get_all_profiles')
      ]);
      if (!cRes.error && cRes.data) setClasses(cRes.data);
      if (!tRes.error && tRes.data) setTeachers((tRes.data as any[]).filter((p) => p.role === 'teacher'));
    })();
  }, [profile]);

  // fetch events for week
  useEffect(() => {
    if (!profile) return;
    const start = new Date(weekStart);
    const end = addDays(start, 7);
    supabase.rpc('get_user_events', { p_start: start.toISOString(), p_end: end.toISOString() })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error('Failed to load events');
          return;
        }
        // enrich with class/teacher names
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
      });
  }, [profile, weekStart, classes, teachers]);

  const resetForm = () => {
    setForm({ title: '', class_id: '', teacher_id: '', start_at: '', end_at: '', room: '', notes: '', recurrence_rule: 'NONE', recurrence_end_at: '', mode: 'in_person', zoom_url: '' });
  };

  const onEdit = (e: any) => {
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
  };

  const onDelete = async (id: string) => {
    try {
      const prev = events;
      setEvents(prev.filter((x) => x.id !== id));
      const { error } = await supabase.from('schedule_events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Event deleted');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const onSave = async () => {
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
        // optimistic update
        setEvents((prev) => prev.map((x) => x.id === selected.id ? { ...x, ...payload } : x));
        toast.success('Event updated');
      } else {
        const insert = { ...payload, created_by: profile!.id };
        const { data, error } = await supabase.from('schedule_events').insert(insert).select('*').single();
        if (error) throw error;
        setEvents((prev) => [{ ...data }, ...prev]);
        toast.success('Event created');
      }
      setIsDialogOpen(false);
      setSelected(null);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    }
  };

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-slate-600 dark:text-slate-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={Calendar}
          title="Schedule"
          description="View and manage your weekly schedule"
          gradient="from-indigo-600 via-purple-600 to-indigo-700"
        />

        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-gradient">Week View</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="px-2 text-sm font-sans">{formatRange(weekStart)}</div>
                <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
                {profile?.role !== 'student' && (
                  <Button className="btn-gradient ml-2" onClick={() => { setSelected(null); resetForm(); setIsDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Filters classes={classes} teachers={teachers} filters={filters} onChange={setFilters} />
            <WeekTable days={getWeekDays(weekStart)} events={filteredEvents(events, filters)} onEdit={onEdit} onDelete={onDelete} canEdit={profile?.role !== 'student'} />
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{selected ? 'Edit Event' : 'Add Event'}</DialogTitle>
              <DialogDescription className="font-sans">Manage schedule event</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div>
                <Label className="text-sm font-sans">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div>
                <Label className="text-sm font-sans">Room</Label>
                <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div>
                <Label className="text-sm font-sans">Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans">Teacher</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans">Start *</Label>
                <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div>
                <Label className="text-sm font-sans">End *</Label>
                <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-sans">Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div>
                <Label className="text-sm font-sans">Recurrence</Label>
                <Select value={form.recurrence_rule} onValueChange={(v) => setForm({ ...form, recurrence_rule: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
                    <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-sans">Recurrence End (optional)</Label>
                <Input type="date" value={form.recurrence_end_at} onChange={(e) => setForm({ ...form, recurrence_end_at: e.target.value })} className="mt-1 input-modern" />
              </div>
              <div>
                <Label className="text-sm font-sans">Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-sans">Zoom URL (optional)</Label>
                <Input value={form.zoom_url} onChange={(e) => setForm({ ...form, zoom_url: e.target.value })} placeholder="https://zoom.us/j/..." className="mt-1 input-modern" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="btn-gradient" onClick={onSave} disabled={!form.title || !form.start_at || !form.end_at}>{selected ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Helpers and subcomponents
function startOfWeek(d: Date) { const x = new Date(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day; x.setDate(x.getDate() + diff); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function formatRange(start: Date) { const end = addDays(start, 6); return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`; }
function getWeekDays(start: Date) { return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
function toLocalInput(dateString: string) {
  const d = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function toLocalDate(dateString: string) {
  const d = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// Expand recurring events (WEEKLY/DAILY/MONTHLY) into instances within [start,end)
function expandRecurringEvents(events: any[], rangeStart: Date, rangeEnd: Date) {
  const out: any[] = [];
  for (const e of events) {
    const baseStart = new Date(e.start_at);
    const baseEnd = new Date(e.end_at);
    const recurEnd = e.recurrence_end_at ? new Date(e.recurrence_end_at) : null;
    const limitEnd = recurEnd && recurEnd < rangeEnd ? recurEnd : rangeEnd;
    const freq = parseFreq(e.recurrence_rule);
    if (!freq || freq === 'NONE') {
      // non-recurring: include if overlaps
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
      // same weekday/time within this week
      const target = sameWeekday(rangeStart, baseStart.getDay());
      const instStart = new Date(target);
      instStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const instEnd = new Date(target);
      instEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);
      if (overlaps(instStart, instEnd, rangeStart, limitEnd)) {
        out.push({ ...e, id: `${e.id}-W-${instStart.toISOString()}`, start_at: instStart.toISOString(), end_at: instEnd.toISOString() });
      }
    } else if (freq === 'MONTHLY') {
      // same day-of-month if it falls inside the week
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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function sameWeekday(weekStart: Date, weekday: number) {
  // weekStart is Monday-based; JS getDay(): Sun=0..Sat=6
  // Map desired weekday to offset from Monday (Mon=1 => 0, Tue=2 => 1, Sun=0 => 6)
  const d = new Date(weekStart);
  const offsetFromMonday = (weekday + 6) % 7;
  return addDays(d, offsetFromMonday);
}

function filteredEvents(events: any[], filters: { class_id: string; teacher_id: string }) {
  const isAll = (v: string) => v === '' || v === 'ALL';
  return events.filter((e) => (isAll(filters.class_id) || e.class_id === filters.class_id) && (isAll(filters.teacher_id) || e.teacher_id === filters.teacher_id));
}

function Filters({ classes, teachers, filters, onChange }: any) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <div className="w-full md:w-64">
        <Label className="text-sm font-sans">Class</Label>
        <Select value={filters.class_id} onValueChange={(v) => onChange({ ...filters, class_id: v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {classes.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-64">
        <Label className="text-sm font-sans">Teacher</Label>
        <Select value={filters.teacher_id} onValueChange={(v) => onChange({ ...filters, teacher_id: v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {teachers.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function WeekTable({ days, events, onEdit, onDelete, canEdit }: any) {
  const dayEvents = (d: Date) => events.filter((e: any) => new Date(e.start_at).toDateString() === d.toDateString());
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map((d: Date) => (
        <div key={d.toISOString()} className="border rounded-lg p-3">
          <div className="text-sm font-semibold mb-2">{d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          <div className="space-y-2">
            {dayEvents(d).length === 0 && (
              <div className="text-xs text-slate-500">No events</div>
            )}
            {dayEvents(d).map((e: any) => (
              <div key={e.id} className="p-2 rounded border bg-white dark:bg-slate-900">
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs text-slate-500">{new Date(e.start_at).toLocaleTimeString()} - {new Date(e.end_at).toLocaleTimeString()}</div>
                {(e.class_name || e.room || e.teacher_name) && (
                  <div className="text-xs text-slate-500">{[e.class_name, e.room, e.teacher_name].filter(Boolean).join(' • ')}</div>
                )}
                {canEdit && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(e)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(e.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                    {e.class_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const dateStr = new Date(e.start_at).toISOString().slice(0,10);
                          window.location.href = `/dashboard/attendance?classId=${e.class_id}&date=${dateStr}`;
                        }}
                      >
                        تسجيل الحضور
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Data loading inside component (moved from global scope)



