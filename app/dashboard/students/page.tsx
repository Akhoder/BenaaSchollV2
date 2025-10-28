'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StudentsTable } from '@/components/EnhancedTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentsOptimized } from '@/lib/optimizedQueries';
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
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Users,
  BookOpen,
  Award,
  Loader2,
  MoreVertical,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  language_preference: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  enrolled_classes?: number;
  average_grade?: string;
}

export default function StudentsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
      fetchStudents();
    }
  }, [profile, authLoading, router]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // استخدام الاستعلام المحسن
      const { data: allStudents, error } = await getStudentsOptimized(
        profile?.role || 'student', 
        profile?.id
      );
      
      if (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to fetch students');
        setStudents([]);
        return;
      }
      
      if (allStudents && allStudents.length > 0) {
        // معالجة البيانات المحسنة
        const processedStudents = await Promise.all(
          allStudents.map(async (student: any) => {
            // الحصول على عدد الفصول المسجل فيها الطالب
            const { data: enrollments } = await supabase
              .from('student_enrollments')
              .select('class_id')
              .eq('student_id', student.id);
            
            return {
              ...student,
              enrolled_classes: enrollments?.length || 0,
              average_grade: '85.5', // يمكن تحسين هذا لاحقاً
            };
          })
        );
        
        setStudents(processedStudents);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);

      if (error) {
        toast.error('Failed to delete student');
      } else {
        toast.success('Student deleted successfully');
        fetchStudents();
      }
    } catch (err) {
      toast.error('An error occurred');
    }
    setDeleteConfirmOpen(false);
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.phone && student.phone.includes(searchQuery));
    return matchesSearch;
  });

  const stats = {
    total: students.length,
    enrolled: students.filter((s) => (s.enrolled_classes || 0) > 0).length,
    notEnrolled: students.filter((s) => (s.enrolled_classes || 0) === 0).length,
    averageGrade: 'B+',
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              {t('students')} Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-sans">
              Manage and track all students in the system
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
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Total Students
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.total}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">All students</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Enrolled
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.enrolled}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">In classes</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Not Enrolled
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <User className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-600">{stats.notEnrolled}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Need enrollment</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Average Grade
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Award className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.averageGrade}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Overall average</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">Search & Filter</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 font-sans"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <StudentsTable />

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Edit Student</DialogTitle>
              <DialogDescription className="font-sans">
                Update student information and details
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">Full Name</label>
                    <Input defaultValue={selectedStudent.full_name} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">Email</label>
                    <Input defaultValue={selectedStudent.email} className="mt-1 font-sans" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">Phone</label>
                    <Input defaultValue={selectedStudent.phone} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">Language</label>
                    <Select defaultValue={selectedStudent.language_preference}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-sans">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Confirm Deletion</DialogTitle>
              <DialogDescription className="font-sans">
                Are you sure you want to delete this student? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>Name:</strong> {selectedStudent.full_name}
                </p>
                <p className="font-sans">
                  <strong>Email:</strong> {selectedStudent.email}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedStudent && handleDelete(selectedStudent.id)}
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
