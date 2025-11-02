'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  School,
  Calendar,
  Users,
  BookOpen,
  Image,
  Target,
  FileText,
  Loader2,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassData {
  id: string;
  class_code: string;
  class_name: string;
  start_date: string;
  end_date?: string;
  level: number;
  image_url?: string;
  goals: string;
  notes?: string;
  teacher_id?: string;
  supervisor_id?: string;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  supervisor_name?: string;
  student_count?: number;
  published?: boolean;
}

export default function ClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    level: 1,
    image_url: '',
    objectives: '',
    notes: '',
    teacher_id: '',
    supervisor_id: '',
  });

  const formatDateForInput = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const prefillFormFromClass = (c: ClassData) => {
    setFormData({
      name: c.class_name || '',
      start_date: formatDateForInput(c.start_date),
      end_date: formatDateForInput(c.end_date || ''),
      level: c.level || 1,
      image_url: c.image_url || '',
      objectives: c.goals || '',
      notes: c.notes || '',
      teacher_id: c.teacher_id || '',
      supervisor_id: c.supervisor_id || '',
    });
  };

  useEffect(() => {
    if (isDialogOpen && selectedClass) {
      setFormData({
        name: selectedClass.class_name || '',
        start_date: formatDateForInput(selectedClass.start_date),
        end_date: formatDateForInput(selectedClass.end_date || ''),
        level: selectedClass.level || 1,
        image_url: selectedClass.image_url || '',
        objectives: selectedClass.goals || '',
        notes: selectedClass.notes || '',
        teacher_id: selectedClass.teacher_id || '',
        supervisor_id: selectedClass.supervisor_id || '',
      });
    }
    if (isDialogOpen && !selectedClass) {
      resetForm();
    }
  }, [isDialogOpen, selectedClass]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }

    // Check if user has access (admin, teacher, or supervisor)
    if (authLoading === false && profile && !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }

    if (profile && ['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      fetchClasses();
    }
  }, [profile, authLoading, router]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      // محاولة إنشاء الجدول أولاً إذا لم يكن موجوداً
      const { error: createError } = await supabase
        .from('classes')
        .select('id')
        .limit(1);
      
      if (createError && createError.code === 'PGRST116') {
        // الجدول غير موجود، عرض رسالة للمستخدم
        toast.error('Classes table not found. Please run the migration first.');
        setClasses([]);
        return;
      }
      
      // استخدام الاستعلام المباشر
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:profiles!teacher_id(full_name),
          supervisor:profiles!supervisor_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to fetch classes');
        return;
      }

      // إضافة عدد الطلاب لكل فصل
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls) => {
          try {
            const { count } = await supabase
              .from('student_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id);
            
            return {
              ...cls,
              teacher_name: cls.teacher?.full_name || 'Unassigned',
              supervisor_name: cls.supervisor?.full_name || 'Unassigned',
              student_count: count || 0,
            };
          } catch (err) {
            // إذا فشل استعلام student_enrollments، استخدم القيم الافتراضية
            return {
              ...cls,
              teacher_name: cls.teacher?.full_name || 'Unassigned',
              supervisor_name: cls.supervisor?.full_name || 'Unassigned',
              student_count: 0,
            };
          }
        })
      );
      
      setClasses(classesWithCounts);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateClassCode = () => {
    const prefix = 'CLS';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSaveClass = async () => {
    try {
      setIsCreating(true);
      
      if (selectedClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            class_name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            level: formData.level,
            image_url: formData.image_url || null,
            goals: formData.objectives,
            notes: formData.notes || null,
            teacher_id: formData.teacher_id || null,
            supervisor_id: formData.supervisor_id || null,
          })
          .eq('id', selectedClass.id);
        
        if (error) {
          console.error('Error updating class:', error);
          toast.error('Failed to update class');
        } else {
          toast.success('Class updated successfully');
          setIsDialogOpen(false);
          setSelectedClass(null);
          resetForm();
          fetchClasses();
        }
      } else {
        const classCode = generateClassCode();
        const { error } = await supabase
          .from('classes')
          .insert({
            class_code: classCode,
            class_name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            level: formData.level,
            image_url: formData.image_url || null,
            goals: formData.objectives,
            notes: formData.notes || null,
            teacher_id: formData.teacher_id || null,
            supervisor_id: formData.supervisor_id || null,
          });

        if (error) {
          console.error('Error creating class:', error);
          toast.error('Failed to create class');
        } else {
          toast.success('Class created successfully');
          setIsDialogOpen(false);
          resetForm();
          fetchClasses();
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) {
        toast.error('Failed to delete class');
      } else {
        toast.success('Class deleted successfully');
        fetchClasses();
      }
    } catch (err) {
      toast.error('An error occurred');
    }
    setDeleteConfirmOpen(false);
    setSelectedClass(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      level: 1,
      image_url: '',
      objectives: '',
      notes: '',
      teacher_id: '',
      supervisor_id: '',
    });
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      (cls.class_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (cls.class_code || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      ((cls.teacher_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));
    return matchesSearch;
  });

  const stats = {
    total: classes.length,
    active: classes.filter((c) => !c.end_date || new Date(c.end_date) > new Date()).length,
    completed: classes.filter((c) => c.end_date && new Date(c.end_date) <= new Date()).length,
    totalStudents: classes.reduce((sum, c) => sum + (c.student_count || 0), 0),
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading classes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  // إذا لم يتم العثور على الجداول، اعرض رسالة توضيحية
  if (classes.length === 0 && !loading && !authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Classes Management
            </h1>
            <p className="text-blue-50 mt-1 text-lg font-medium font-sans">
              Manage school classes and enrollments
            </p>
          </div>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Database Setup Required
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  The classes table needs to be created in your Supabase database. Please follow these steps:
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 text-left mb-6">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Steps to Fix:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Open your Supabase Dashboard</li>
                  <li>Go to SQL Editor</li>
                  <li>Copy the migration code from: <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">supabase/migrations/20251028030000_disable_rls_temporary.sql</code></li>
                  <li>Paste and run the SQL code</li>
                  <li>Refresh this page</li>
                </ol>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Refresh Page
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const migrationCode = `-- Copy this code to Supabase SQL Editor
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code text UNIQUE NOT NULL,
  class_name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  level integer NOT NULL CHECK (level >= 1 AND level <= 12),
  image_url text,
  goals text,
  notes text,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT ALL ON classes TO authenticated;`;
                    navigator.clipboard.writeText(migrationCode);
                    toast.success('Migration code copied to clipboard!');
                  }}
                >
                  Copy Migration Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                <School className="h-6 w-6 text-white" />
              </div>
              Classes Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-sans">
              Manage and organize all classes in the system
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="border-slate-200 dark:border-slate-800"
            >
              <Users className="h-4 w-4" />
            </Button>
            {profile.role === 'admin' && (
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                onClick={() => {
                  setSelectedClass(null);
                  setIsViewing(false);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Total Classes
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <School className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.total}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">All classes</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Active Classes
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.active}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Currently running</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Completed
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-600">{stats.completed}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Finished classes</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Total Students
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.totalStudents}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Enrolled students</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">Search Classes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by class name, code, or teacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 font-sans"
              />
            </div>
          </CardContent>
        </Card>

        {/* Classes List */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display">
                <School className="h-5 w-5 text-blue-600" />
                Classes ({filteredClasses.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12">
                <School className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-sans">
                  No classes found matching your criteria
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold font-sans">Class</TableHead>
                      <TableHead className="font-semibold font-sans">Code</TableHead>
                      <TableHead className="font-semibold font-sans">Level</TableHead>
                      <TableHead className="font-semibold font-sans">Students</TableHead>
                      <TableHead className="font-semibold font-sans">Duration</TableHead>
                      <TableHead className="font-semibold font-sans">Status</TableHead>
                      <TableHead className="font-semibold font-sans">Published</TableHead>
                      {profile.role === 'admin' && (
                        <TableHead className="text-right font-semibold font-sans">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((cls) => (
                      <TableRow
                        key={cls.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                              <AvatarImage src={cls.image_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                                {(cls.class_name || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold font-sans">{cls.class_name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                                Level {cls.level}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {cls.class_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                            Level {cls.level}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-sans">
                            <Users className="h-4 w-4 text-slate-400" />
                            {cls.student_count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-sans">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(cls.start_date).toLocaleDateString()}
                            </div>
                            {cls.end_date && (
                              <div className="text-xs text-slate-500">
                                to {new Date(cls.end_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={cls.end_date && new Date(cls.end_date) <= new Date() ? 'secondary' : 'default'}
                            className={cn(
                              'font-semibold',
                              cls.end_date && new Date(cls.end_date) <= new Date()
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            )}
                          >
                            {cls.end_date && new Date(cls.end_date) <= new Date() ? 'Completed' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={cls.published === true}
                            onCheckedChange={async (val) => {
                              const { error } = await supabase
                                .from('classes')
                                .update({ published: val })
                                .eq('id', cls.id);
                              if (error) {
                                toast.error('Failed to update');
                              } else {
                                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, published: val } : c));
                              }
                            }}
                          />
                        </TableCell>
                        {profile.role === 'admin' && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="font-display">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    prefillFormFromClass(cls);
                                    setIsViewing(true);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setIsViewing(false);
                                    prefillFormFromClass(cls);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Class Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {isViewing ? 'View Class' : selectedClass ? 'Edit Class' : 'Create New Class'}
              </DialogTitle>
              <DialogDescription className="font-sans">
                {isViewing
                  ? 'View class information'
                  : selectedClass
                    ? 'Update class information'
                    : 'Add a new class to the system'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Class Code (Auto Generated) */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <Label className="text-sm font-medium font-sans">Class Code (Auto Generated)</Label>
                <div className="mt-2 p-3 bg-white dark:bg-slate-800 border rounded-md font-mono text-sm">
                  {selectedClass ? selectedClass.class_code : generateClassCode()}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  This code is automatically generated and cannot be changed
                </p>
              </div>

              {/* Class Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium font-sans">Class Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter class name"
                  className="mt-1 font-sans"
                  disabled={isViewing}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className="text-sm font-medium font-sans">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 font-sans"
                    disabled={isViewing}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date" className="text-sm font-medium font-sans">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 font-sans"
                    disabled={isViewing}
                  />
                </div>
              </div>

              {/* Level */}
              <div>
                <Label htmlFor="level" className="text-sm font-medium font-sans">Level *</Label>
                <Select
                  value={formData.level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1 font-sans" disabled={isViewing}>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image URL */}
              <div>
                <Label htmlFor="image_url" className="text-sm font-medium font-sans">Class Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1 font-sans"
                  disabled={isViewing}
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Class preview"
                      className="w-20 h-20 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Objectives */}
              <div>
                <Label htmlFor="objectives" className="text-sm font-medium font-sans">Objectives *</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="Describe the learning objectives for this class..."
                  className="mt-1 font-sans min-h-[100px]"
                  disabled={isViewing}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium font-sans">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this class..."
                  className="mt-1 font-sans min-h-[80px]"
                  disabled={isViewing}
                />
              </div>
            </div>

            <DialogFooter>
              {isViewing ? (
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveClass}
                    disabled={isCreating || !formData.name || !formData.start_date || !formData.objectives}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-sans"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      selectedClass ? 'Update Class' : 'Create Class'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Confirm Deletion</DialogTitle>
              <DialogDescription className="font-sans">
                Are you sure you want to delete this class? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedClass && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>Class:</strong> {selectedClass.class_name}
                </p>
                <p className="font-sans">
                  <strong>Code:</strong> {selectedClass.class_code}
                </p>
                <p className="font-sans">
                  <strong>Level:</strong> {selectedClass.level}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedClass && handleDelete(selectedClass.id)}
                className="font-sans"
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