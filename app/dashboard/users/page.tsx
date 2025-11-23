'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getUsersOptimized } from '@/lib/optimizedQueries';
import { getErrorMessage } from '@/lib/errorHandler';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase, uploadUserAvatar, deleteUserAvatar } from '@/lib/supabase';
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
  gender?: 'male' | 'female';
  // Common fields
  address?: string;
  date_of_birth?: string;
  // Teacher fields
  specialization?: string;
  years_of_experience?: number;
  qualifications?: string;
  bio?: string;
  // Student fields
  parent_name?: string;
  parent_phone?: string;
  emergency_contact?: string;
  // Admin/Supervisor fields
  appointment_date?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
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
  const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
  // Common fields
  const [editAddress, setEditAddress] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  // Teacher fields
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editYearsOfExperience, setEditYearsOfExperience] = useState('');
  const [editQualifications, setEditQualifications] = useState('');
  const [editBio, setEditBio] = useState('');
  // Student fields
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  // Admin/Supervisor fields
  const [editAppointmentDate, setEditAppointmentDate] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  // Avatar upload
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const dateLocale = useMemo(() => (language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US'), [language]);

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
      
      // Upload avatar if a new file was selected
      let avatarUrl = editAvatarUrl;
      if (avatarFile && selectedUser) {
        setUploadingAvatar(true);
        const { data: uploadData, error: uploadError } = await uploadUserAvatar(avatarFile, selectedUser.id);
        if (uploadError) {
          toast.error(uploadError.message || t('failedToUploadAvatar' as TranslationKey));
          setUploadingAvatar(false);
          return;
        }
        avatarUrl = uploadData?.publicUrl || '';
        setUploadingAvatar(false);
      } else if (avatarFile && !selectedUser) {
        // For new users, we'll upload after creating the user
        // But we need the user ID first, so we'll handle this after insert
      }

      const updateData: any = {
        full_name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        phone: editPhone.trim() || null,
        avatar_url: avatarUrl || null,
        gender: editGender || null,
        // Common fields
        address: editAddress.trim() || null,
        date_of_birth: editDateOfBirth || null,
        // Teacher fields
        specialization: editSpecialization.trim() || null,
        years_of_experience: editYearsOfExperience ? parseInt(editYearsOfExperience) : null,
        qualifications: editQualifications.trim() || null,
        bio: editBio.trim() || null,
        // Student fields
        parent_name: editParentName.trim() || null,
        parent_phone: editParentPhone.trim() || null,
        emergency_contact: editEmergencyContact.trim() || null,
        // Admin/Supervisor fields
        appointment_date: editAppointmentDate || null,
        department: editDepartment.trim() || null,
      };

      if (selectedUser) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', selectedUser.id);
        
        if (error) {
          console.error(error);
          toast.error(t('failedToSave' as TranslationKey));
          return;
        }
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updateData } : u));
        toast.success(t('userUpdated' as TranslationKey));
      } else {
        // Create new user
        if (!editName.trim() || !editEmail.trim()) {
          toast.error(t('nameAndEmailRequired' as TranslationKey));
          return;
        }
        const { data: newUser, error } = await supabase.from('profiles').insert([{
          ...updateData,
          language_preference: 'en',
          gender: editGender || null,
        }]).select().single();
        
        if (error) {
          console.error(error);
          toast.error(t('failedToCreate' as TranslationKey));
          return;
        }

        // Upload avatar for new user if file was selected
        if (avatarFile && newUser) {
          setUploadingAvatar(true);
          const { data: uploadData, error: uploadError } = await uploadUserAvatar(avatarFile, newUser.id);
          if (!uploadError && uploadData?.publicUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: uploadData.publicUrl })
              .eq('id', newUser.id);
          }
          setUploadingAvatar(false);
        }

        toast.success(t('userCreated' as TranslationKey));
        await fetchUsers();
      }
      setIsDialogOpen(false);
      setSelectedUser(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    } finally {
      setSavingEdit(false);
      setUploadingAvatar(false);
    }
  }, [
    selectedUser, editName, editEmail, editRole, editPhone, editGender, editAvatarUrl,
    editAddress, editDateOfBirth,
    editSpecialization, editYearsOfExperience, editQualifications, editBio,
    editParentName, editParentPhone, editEmergencyContact,
    editAppointmentDate, editDepartment,
    avatarFile,
    t, fetchUsers
  ]);

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
      setEditGender(user.gender || '');
      // Common fields
      setEditAddress(user.address || '');
      setEditDateOfBirth(user.date_of_birth || '');
      // Teacher fields
      setEditSpecialization(user.specialization || '');
      setEditYearsOfExperience(user.years_of_experience?.toString() || '');
      setEditQualifications(user.qualifications || '');
      setEditBio(user.bio || '');
      // Student fields
      setEditParentName(user.parent_name || '');
      setEditParentPhone(user.parent_phone || '');
      setEditEmergencyContact(user.emergency_contact || '');
      // Admin/Supervisor fields
      setEditAppointmentDate(user.appointment_date || '');
      setEditDepartment(user.department || '');
      // Avatar
      setEditAvatarUrl(user.avatar_url || '');
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
    } else {
      setSelectedUser(null);
      setEditName('');
      setEditEmail('');
      setEditRole('student');
      setEditPhone('');
      setEditGender('');
      // Reset all fields
      setEditAddress('');
      setEditDateOfBirth('');
      setEditSpecialization('');
      setEditYearsOfExperience('');
      setEditQualifications('');
      setEditBio('');
      setEditParentName('');
      setEditParentPhone('');
      setEditEmergencyContact('');
      setEditAppointmentDate('');
      setEditDepartment('');
      // Reset avatar
      setEditAvatarUrl('');
      setAvatarPreview(null);
      setAvatarFile(null);
    }
    setIsDialogOpen(true);
  }, []);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageFile' as TranslationKey));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('imageTooLarge' as TranslationKey));
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditAvatarUrl('');
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
                            {new Date(user.created_at).toLocaleDateString(dateLocale)}
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
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Avatar Upload */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('profilePicture' as TranslationKey)}</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-2 ring-blue-500/20">
                      <AvatarImage src={avatarPreview || editAvatarUrl || undefined} />
                      <AvatarFallback className="bg-blue-600 text-white font-semibold text-xl">
                        {editName.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    {(avatarPreview || editAvatarUrl) && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label htmlFor="avatar-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploadingAvatar}
                        asChild
                      >
                        <span className="cursor-pointer">
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('uploading' as TranslationKey)}
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {avatarPreview || editAvatarUrl ? t('changePicture' as TranslationKey) : t('uploadPicture' as TranslationKey)}
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('imageUploadHint' as TranslationKey)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('basicInformation' as TranslationKey)}</h3>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('gender' as TranslationKey)}</label>
                    <Select value={editGender} onValueChange={(v) => setEditGender(v as 'male' | 'female' | '')}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('selectGender' as TranslationKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('male' as TranslationKey)}</SelectItem>
                        <SelectItem value="female">{t('female' as TranslationKey)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('address' as TranslationKey)}</label>
                    <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('dateOfBirth' as TranslationKey)}</label>
                    <Input 
                      type="date"
                      value={editDateOfBirth} 
                      onChange={(e) => setEditDateOfBirth(e.target.value)} 
                      className="mt-1" 
                    />
                  </div>
                </div>
              </div>

              {/* Teacher-specific fields */}
              {(editRole === 'teacher') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('teacherInformation' as TranslationKey)}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t('specialization' as TranslationKey)}</label>
                      <Input value={editSpecialization} onChange={(e) => setEditSpecialization(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('yearsOfExperience' as TranslationKey)}</label>
                      <Input 
                        type="number"
                        min="0"
                        value={editYearsOfExperience} 
                        onChange={(e) => setEditYearsOfExperience(e.target.value)} 
                        className="mt-1" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('qualifications' as TranslationKey)}</label>
                    <Textarea 
                      value={editQualifications} 
                      onChange={(e) => setEditQualifications(e.target.value)} 
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('bio' as TranslationKey)}</label>
                    <Textarea 
                      value={editBio} 
                      onChange={(e) => setEditBio(e.target.value)} 
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Student-specific fields */}
              {(editRole === 'student') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('studentInformation' as TranslationKey)}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t('parentName' as TranslationKey)}</label>
                      <Input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('parentPhone' as TranslationKey)}</label>
                      <Input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('emergencyContact' as TranslationKey)}</label>
                    <Input value={editEmergencyContact} onChange={(e) => setEditEmergencyContact(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}

              {/* Admin/Supervisor-specific fields */}
              {(editRole === 'admin' || editRole === 'supervisor') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('administrativeInformation' as TranslationKey)}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t('appointmentDate' as TranslationKey)}</label>
                      <Input 
                        type="date"
                        value={editAppointmentDate} 
                        onChange={(e) => setEditAppointmentDate(e.target.value)} 
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('department' as TranslationKey)}</label>
                      <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </div>
              )}
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
