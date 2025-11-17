'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getUsersOptimized } from '@/lib/optimizedQueries';
import { getErrorMessage } from '@/lib/errorHandler';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Loader2,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student' | 'supervisor';
  language_preference: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserProfile['role']>('student');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getUsersOptimized();

      if (error) {
        console.error('Error fetching users:', error);
        toast.error(t('failedToFetchUsers'));
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Auth check and load data
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }

    if (authLoading === false && profile && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile?.id, profile?.role, authLoading, fetchUsers, router]);

  // Realtime subscription
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    const channel = supabase
      .channel('profiles-updates-users')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          setUsers(prev => prev.map(u => u.id === row.id ? { ...u, ...row } : u));
        } else if (payload.eventType === 'INSERT') {
          const row = payload.new;
          setUsers(prev => [{ ...row }, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old;
          setUsers(prev => prev.filter(u => u.id !== row.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  // Helper functions
  const getRoleBadgeColor = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      case 'teacher':
        return 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-700';
      case 'student':
        return 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-700';
      case 'supervisor':
        return 'bg-purple-500 text-white border-purple-600 dark:bg-purple-600 dark:border-purple-700';
      default:
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  }, []);

  const getRoleLabel = useCallback((role: string) => {
    return t(role as 'admin' | 'teacher' | 'student' | 'supervisor');
  }, [t]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = debouncedSearchQuery.toLowerCase();
      const matchesSearch =
        (user.full_name || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.phone || '').toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearchQuery, roleFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      teachers: users.filter((u) => u.role === 'teacher').length,
      students: users.filter((u) => u.role === 'student').length,
      supervisors: users.filter((u) => u.role === 'supervisor').length,
    };
  }, [users]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, roleFilter]);

  // Handlers
  const handleDelete = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        toast.error(t('failedToDeleteUser'));
      } else {
        toast.success(t('userDeletedSuccessfully'));
        fetchUsers();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
    }
  }, [t, fetchUsers]);

  const handleEditSave = useCallback(async () => {
    try {
      setSavingEdit(true);
      if (selectedUser) {
        const { error } = await supabase.rpc('admin_update_profile', {
          p_id: selectedUser.id,
          p_full_name: editName || null,
          p_email: editEmail || null,
          p_phone: editPhone || null,
          p_language: null,
          p_role: editRole || null,
        });
        if (error) {
          console.error(error);
          toast.error(t('failedToSave'));
          return;
        }
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
          ...u,
          full_name: editName,
          email: editEmail,
          role: editRole,
          phone: editPhone || undefined,
        } : u));
        toast.success(t('userUpdated'));
      } else {
        if (!editName.trim() || !editEmail.trim()) {
          toast.error(t('nameAndEmailRequired'));
          return;
        }
        const { error } = await supabase.from('profiles').insert([{
          full_name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          phone: editPhone.trim() || null,
          language_preference: 'en',
        }]);
        if (error) {
          console.error(error);
          toast.error(t('failedToCreate'));
          return;
        }
        toast.success(t('userCreated'));
        await fetchUsers();
      }
      setIsDialogOpen(false);
      setSelectedUser(null);
    } finally {
      setSavingEdit(false);
    }
  }, [selectedUser, editName, editEmail, editRole, editPhone, t, fetchUsers]);

  const handlePasswordChange = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setSavingPw(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userId: selectedUser.id, newPassword: newPw })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || t('failedToChangePassword'));
        return;
      }
      toast.success(t('passwordUpdated'));
      setPwOpen(false);
      setNewPw('');
    } finally {
      setSavingPw(false);
    }
  }, [selectedUser, newPw, t]);

  const openEditDialog = useCallback((user: UserProfile | null) => {
    if (user) {
      setSelectedUser(user);
      setEditName(user.full_name || '');
      setEditEmail(user.email || '');
      setEditRole(user.role);
      setEditPhone(user.phone || '');
    } else {
      setSelectedUser(null);
      setEditName('');
      setEditEmail('');
      setEditRole('student');
      setEditPhone('');
    }
    setIsDialogOpen(true);
  }, []);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingUsers')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={User}
          title={t('usersManagement')}
          description={t('manageAllUsers')}
        >
          <Button 
            onClick={() => openEditDialog(null)}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addUser')}
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('totalUsers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('admin')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-red-600">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('teacher')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.teachers}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('student')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.students}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('supervisor')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.supervisors}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-hover glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Filter className="h-5 w-5 text-slate-500" />
              {t('filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t('searchByNameOrEmail')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 input-modern"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-11">
                  <SelectValue placeholder={t('filterByRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="teacher">{t('teacher')}</SelectItem>
                  <SelectItem value="student">{t('student')}</SelectItem>
                  <SelectItem value="supervisor">{t('supervisor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="card-hover glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {t('users')} ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-slate-500 dark:text-slate-400">
                  {t('noUsersFound')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold">{t('user')}</TableHead>
                      <TableHead className="font-semibold">{t('role')}</TableHead>
                      <TableHead className="font-semibold">{t('email')}</TableHead>
                      <TableHead className="font-semibold">{t('phone')}</TableHead>
                      <TableHead className="font-semibold">{t('created')}</TableHead>
                      <TableHead className="text-right font-semibold">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-blue-600 text-white font-semibold">
                                {user.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold font-sans">{user.full_name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                ID: {user.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('font-semibold', getRoleBadgeColor(user.role))}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.phone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              onClick={() => {
                                setSelectedUser(user);
                                setPwOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          
          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('showingUsers')
                    .replace('{start}', (startIndex + 1).toString())
                    .replace('{end}', Math.min(endIndex, filteredUsers.length).toString())
                    .replace('{total}', filteredUsers.length.toString())}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {selectedUser ? t('editUser') : t('createUser')}
              </DialogTitle>
              <DialogDescription>
                {selectedUser ? t('updateUserInfo') : t('addNewUser')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('fullName')}</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('email')}</label>
                  <Input 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    className="mt-1"
                    disabled={!!selectedUser}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('role')}</label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('admin')}</SelectItem>
                      <SelectItem value="teacher">{t('teacher')}</SelectItem>
                      <SelectItem value="student">{t('student')}</SelectItem>
                      <SelectItem value="supervisor">{t('supervisor')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('phone')}</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                disabled={savingEdit}
                onClick={handleEditSave}
              >
                {savingEdit ? (selectedUser ? t('saving') : t('creating')) : (selectedUser ? t('saveChanges') : t('addUser'))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('changePassword')}</DialogTitle>
              <DialogDescription>{t('setNewPassword')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder={t('newPassword')}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                disabled={savingPw || !selectedUser || newPw.length < 6}
                onClick={handlePasswordChange}
              >
                {savingPw ? t('saving') : t('saveChanges')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('confirmDeletion')}</DialogTitle>
              <DialogDescription>
                {t('deleteUserConfirm')}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4 space-y-2">
                <p>
                  <strong>{t('fullName')}:</strong> {selectedUser.full_name}
                </p>
                <p>
                  <strong>{t('email')}:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>{t('role')}:</strong> {getRoleLabel(selectedUser.role)}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedUser && handleDelete(selectedUser.id)}
              >
                {t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
