'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Plus, MoreVertical, Edit, Search, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher';
  avatar_url?: string;
  phone?: string;
  language_preference?: string;
  created_at: string;
  updated_at: string;
}

export default function TeachersPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', full_name: '' });

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    language_preference: 'en',
  });

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      void loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Prefer RPC for admin to bypass RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
      if (!rpcError && rpcData) {
        setTeachers((rpcData as any[]).filter(p => p.role === 'teacher'));
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .order('full_name', { ascending: true });
        if (error) throw error;
        setTeachers((data || []) as any);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    return teachers.filter((t) =>
      (t.full_name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.phone || '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const openEdit = (t: TeacherProfile) => {
    setSelected(t);
    setForm({
      full_name: t.full_name || '',
      phone: t.phone || '',
      avatar_url: t.avatar_url || '',
      language_preference: t.language_preference || 'en',
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    try {
      setIsSaving(true);
      if (selected) {
        const { error } = await supabase.rpc('admin_update_profile', {
          p_id: selected.id,
          p_full_name: form.full_name,
          p_phone: form.phone || null,
          p_avatar_url: form.avatar_url || null,
          p_language_preference: form.language_preference,
        });
        if (error) throw error;
        toast.success('Teacher updated');
        // Optimistic local update
        setTeachers(prev => prev.map(t => t.id === selected.id ? {
          ...t,
          full_name: form.full_name,
          phone: form.phone || undefined,
          avatar_url: form.avatar_url || undefined,
          language_preference: form.language_preference,
        } : t));
      } else {
        if (isCreateNew) {
          // Create new teacher account via Supabase Auth
          if (!newAccount.email || !newAccount.password || !newAccount.full_name) {
            toast.error('Email, password and full name are required');
            return;
          }
          const { data: signData, error: signError } = await supabase.auth.signUp({
            email: newAccount.email,
            password: newAccount.password,
            options: {
              data: { full_name: newAccount.full_name, role: 'teacher' }
            }
          });
          if (signError) throw signError;
          // Profile should be created by trigger; ensure role is teacher
          if (signData.user) {
            await supabase
              .from('profiles')
              .update({ role: 'teacher', full_name: newAccount.full_name })
              .eq('id', signData.user.id);
          }
          toast.success('Teacher account created');
        } else {
          // Promote existing user to teacher by email
          if (!promoteEmail) {
            toast.error('Enter email to promote');
            return;
          }
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'teacher' })
            .eq('email', promoteEmail);
          if (error) throw error;
          toast.success('User promoted to teacher');
        }
      }
      setIsDialogOpen(false);
      setSelected(null);
      setPromoteEmail('');
      setIsCreateNew(false);
      setNewAccount({ email: '', password: '', full_name: '' });
      await loadData();
    } catch (e: any) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading teachers...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              Teachers
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-sans">Manage teacher accounts</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            onClick={() => {
              setSelected(null);
              setPromoteEmail('');
              setForm({ full_name: '', phone: '', avatar_url: '', language_preference: 'en' });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Promote User to Teacher
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 font-sans"
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="font-display">Teachers ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="font-semibold font-sans">Teacher</TableHead>
                    <TableHead className="font-semibold font-sans">Email</TableHead>
                    <TableHead className="font-semibold font-sans">Phone</TableHead>
                    <TableHead className="font-semibold font-sans">Language</TableHead>
                    <TableHead className="text-right font-semibold font-sans">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-purple-500/20">
                            <AvatarImage src={t.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold">
                              {t.full_name?.charAt(0).toUpperCase() || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold font-sans">{t.full_name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-sans">Teacher</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-sans"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {t.email}</div></TableCell>
                      <TableCell className="font-sans"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {t.phone || '—'}</div></TableCell>
                      <TableCell className="font-sans">{t.language_preference || 'en'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-display">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(t)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{selected ? 'Edit Teacher' : 'Promote User to Teacher'}</DialogTitle>
              <DialogDescription className="font-sans">
                {selected ? 'Update teacher information' : 'Enter an existing user email to promote to teacher'}
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium font-sans">Full Name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 font-sans" />
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 font-sans" />
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans">Avatar URL</Label>
                  <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="mt-1 font-sans" />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <input
                    id="create_new_teacher"
                    type="checkbox"
                    checked={isCreateNew}
                    onChange={(e) => setIsCreateNew(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="create_new_teacher" className="text-sm font-medium font-sans">Create new teacher account</Label>
                </div>

                {isCreateNew ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium font-sans">Full Name</Label>
                      <Input value={newAccount.full_name} onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })} className="mt-1 font-sans" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium font-sans">Email</Label>
                      <Input type="email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} placeholder="teacher@example.com" className="mt-1 font-sans" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium font-sans">Password</Label>
                      <Input type="password" value={newAccount.password} onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} className="mt-1 font-sans" />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label className="text-sm font-medium font-sans">User Email</Label>
                    <Input value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="user@example.com" className="mt-1 font-sans" />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">Cancel</Button>
              <Button onClick={save} disabled={
                isSaving || (selected ? !form.full_name : (isCreateNew ? (!newAccount.email || !newAccount.password || !newAccount.full_name) : !promoteEmail))
              } className="font-sans">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


