'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getUsersOptimized } from '@/lib/optimizedQueries';
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
  // ✅ PERFORMANCE: Debounce search to reduce re-renders
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

  // ✅ PERFORMANCE: Use optimized query function with caching and memoize
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getUsersOptimized();

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ PERFORMANCE: Optimize dependencies - only depend on profile.id and authLoading
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

  // ✅ PERFORMANCE: Optimize realtime subscription - only depend on profile.id
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

  const handleDelete = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        toast.error('Failed to delete user');
      } else {
        toast.success('User deleted successfully');
        fetchUsers();
      }
    } catch (err) {
      toast.error('An error occurred');
    }
    setDeleteConfirmOpen(false);
    setSelectedUser(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'teacher':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'student':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
      case 'supervisor':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
      default:
        return 'bg-slate-200 dark:bg-slate-700';
    }
  };

  // ✅ PERFORMANCE: Use debounced search and memoize filtered results
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        (user.full_name || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase()) ||
        (user.email || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase()) ||
        (user.phone || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearchQuery, roleFilter]);

  // ✅ PAGINATION: Add pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // ✅ PERFORMANCE: Reset page when debounced search or role filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, roleFilter]);

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
    students: users.filter((u) => u.role === 'student').length,
    supervisors: users.filter((u) => u.role === 'supervisor').length,
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading users...</p>
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
        {/* Enhanced Header */}
        <PageHeader 
          icon={User}
          title="Users Management"
          description="Manage all users in the system"
          gradient="from-blue-600 via-purple-600 to-blue-700"
        >
          <Button 
            onClick={() => {
              setSelectedUser(null);
              setEditName('');
              setEditEmail('');
              setEditRole('student');
              setEditPhone('');
              setIsDialogOpen(true);
            }}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-red-600">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.teachers}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.students}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Supervisors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.supervisors}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display text-gradient">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 input-modern"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-11">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-slate-500 dark:text-slate-400">
                  No users found matching your criteria
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
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
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
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
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
                              onClick={() => {
                                setSelectedUser(user);
                                setEditName(user.full_name || '');
                                setEditEmail(user.email || '');
                                setEditRole(user.role);
                                setEditPhone(user.phone || '');
                                setIsDialogOpen(true);
                              }}
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
                            {/* reuse icon */}
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
          
          {/* ✅ PAGINATION: Add pagination UI */}
          {filteredUsers.length > itemsPerPage && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Page numbers */}
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
                {selectedUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {selectedUser ? 'Update user information and permissions' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
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
                    <label className="text-sm font-medium">Role</label>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={savingEdit}
                onClick={async () => {
                  try {
                    setSavingEdit(true);
                    if (selectedUser) {
                      // Edit existing user
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
                        toast.error('Failed to save changes');
                        return;
                      }
                      // Optimistic UI update
                      setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
                        ...u,
                        full_name: editName,
                        email: editEmail,
                        role: editRole,
                        phone: editPhone || undefined,
                      } : u));
                      toast.success('User updated');
                    } else {
                      // Create new user
                      if (!editName.trim() || !editEmail.trim()) {
                        toast.error('Name and email are required');
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
                        toast.error('Failed to create user');
                        return;
                      }
                      toast.success('User created');
                      await fetchUsers();
                    }
                    setIsDialogOpen(false);
                    setSelectedUser(null);
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              >
                {savingEdit ? (selectedUser ? 'Saving...' : 'Creating...') : (selectedUser ? 'Save Changes' : 'Create User')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Change Password</DialogTitle>
              <DialogDescription>Set a new password for the selected user</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
              <Button disabled={savingPw || !selectedUser || newPw.length < 6}
                onClick={async () => {
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
                      toast.error(j.error || 'Failed to change password');
                      return;
                    }
                    toast.success('Password updated');
                    setPwOpen(false);
                    setNewPw('');
                  } finally {
                    setSavingPw(false);
                  }
                }}
              >
                {savingPw ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4 space-y-2">
                <p>
                  <strong>Name:</strong> {selectedUser.full_name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Role:</strong> {selectedUser.role}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedUser && handleDelete(selectedUser.id)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

