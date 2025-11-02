'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Calendar,
  User,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  target_roles: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function AnnouncementsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTargetRoles, setEditTargetRoles] = useState<string[]>([]);
  const [editIsPublished, setEditIsPublished] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }

    if (authLoading === false && profile && !['admin', 'teacher', 'supervisor', 'student'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }

    if (profile) {
      fetchAnnouncements();
    }
  }, [profile, authLoading, router]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(id, full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = profile && ['admin', 'teacher', 'supervisor'].includes(profile.role);
  const canEdit = (ann: Announcement) => 
    profile && (profile.role === 'admin' || ann.author_id === profile.id);
  const canDelete = profile && profile.role === 'admin';

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = searchQuery === '' || 
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = roleFilter === 'all' || 
      (roleFilter === 'published' && ann.is_published) ||
      (roleFilter === 'draft' && !ann.is_published);
    
    const matchesRole = profile && (
      profile.role === 'admin' || 
      (ann.is_published && ann.target_roles.includes(profile.role))
    );

    return matchesSearch && matchesFilter && matchesRole;
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading announcements...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  const stats = {
    total: announcements.length,
    published: announcements.filter(a => a.is_published).length,
    drafts: announcements.filter(a => !a.is_published).length,
    myAnnouncements: announcements.filter(a => a.author_id === profile.id).length,
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    teacher: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    student: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    supervisor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={Megaphone}
          title={t('announcements')}
          description="Stay informed with latest news and updates"
          gradient="from-indigo-600 via-purple-600 to-indigo-700"
        >
          {canCreate && (
            <Button
              onClick={() => {
                setSelectedAnnouncement(null);
                setEditTitle('');
                setEditContent('');
                setEditTargetRoles(['student']);
                setEditIsPublished(false);
                setIsDialogOpen(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </Button>
          )}
        </PageHeader>

        {/* Stats Cards */}
        {(profile.role === 'admin' || stats.myAnnouncements > 0) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-emerald-600">{stats.published}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Drafts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-amber-600">{stats.drafts}</div>
              </CardContent>
            </Card>
            {profile.role !== 'student' && (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    My Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display text-indigo-600">{stats.myAnnouncements}</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Search and Filter */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-indigo-600" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 font-sans"
                  />
                </div>
              </div>
              {profile.role !== 'student' && (
                <div className="w-full md:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="font-sans">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-sans">
                  {searchQuery ? 'No announcements found matching your search' : 'No announcements yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((ann) => (
                  <Card
                    key={ann.id}
                    className={cn(
                      "border-slate-200 dark:border-slate-800 transition-all cursor-pointer",
                      "hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800"
                    )}
                    onClick={() => {
                      setSelectedAnnouncement(ann);
                      setEditTitle(ann.title);
                      setEditContent(ann.content);
                      setEditTargetRoles(ann.target_roles);
                      setEditIsPublished(ann.is_published);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-indigo-500/20">
                          <AvatarImage src={ann.author?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                            {ann.author?.full_name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold font-display">{ann.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400">
                                <User className="h-4 w-4" />
                                <span>{ann.author?.full_name}</span>
                                <span>•</span>
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn('font-semibold', ann.is_published ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400')}>
                                {ann.is_published ? (
                                  <><Eye className="h-3 w-3 mr-1" /> Published</>
                                ) : (
                                  <><EyeOff className="h-3 w-3 mr-1" /> Draft</>
                                )}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-sans line-clamp-3">
                            {ann.content}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ann.target_roles.map(role => (
                              <Badge key={role} className={cn('font-semibold', roleColors[role as keyof typeof roleColors])}>
                                {role}
                              </Badge>
                            ))}
                          </div>
                          {(canEdit(ann) || canDelete) && (
                            <div className="flex gap-2 pt-2">
                              {canEdit(ann) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAnnouncement(ann);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {selectedAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </DialogTitle>
              <DialogDescription className="font-sans">
                {selectedAnnouncement ? 'Update announcement details' : 'Share important information with users'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium font-sans">Title</label>
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="Enter announcement title"
                  className="mt-1 font-sans"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter announcement content..."
                  className="mt-1 w-full min-h-[120px] px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 font-sans"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">Target Roles</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(['admin', 'teacher', 'student', 'supervisor'] as const).map(role => (
                    <Badge
                      key={role}
                      className={cn(
                        "cursor-pointer font-semibold transition-all",
                        editTargetRoles.includes(role)
                          ? roleColors[role]
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                      onClick={() => {
                        if (editTargetRoles.includes(role)) {
                          setEditTargetRoles(editTargetRoles.filter(r => r !== role));
                        } else {
                          setEditTargetRoles([...editTargetRoles, role]);
                        }
                      }}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              {canCreate && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editIsPublished}
                    onChange={(e) => setEditIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label className="text-sm font-medium font-sans">Publish immediately</label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                disabled={savingEdit || !editTitle.trim() || !editContent.trim() || editTargetRoles.length === 0}
                onClick={async () => {
                  try {
                    setSavingEdit(true);
                    const payload: any = {
                      title: editTitle.trim(),
                      content: editContent.trim(),
                      target_roles: editTargetRoles,
                      is_published: editIsPublished,
                    };

                    if (selectedAnnouncement) {
                      const { error } = await supabase
                        .from('announcements')
                        .update(payload)
                        .eq('id', selectedAnnouncement.id);
                      if (error) throw error;
                      toast.success('Announcement updated');
                    } else {
                      const { error } = await supabase
                        .from('announcements')
                        .insert([payload]);
                      if (error) throw error;
                      toast.success('Announcement created');
                    }
                    await fetchAnnouncements();
                    setIsDialogOpen(false);
                    setSelectedAnnouncement(null);
                  } catch (error: any) {
                    console.error(error);
                    toast.error('Failed to save announcement');
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              >
                {savingEdit ? (selectedAnnouncement ? 'Saving...' : 'Creating...') : (selectedAnnouncement ? 'Save Changes' : 'Create Announcement')}
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
                Are you sure you want to delete this announcement? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedAnnouncement && (
              <div className="py-4 space-y-2">
                <p className="font-semibold font-display">{selectedAnnouncement.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-sans line-clamp-2">
                  {selectedAnnouncement.content}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!selectedAnnouncement) return;
                  try {
                    const { error } = await supabase
                      .from('announcements')
                      .delete()
                      .eq('id', selectedAnnouncement.id);
                    if (error) throw error;
                    toast.success('Announcement deleted');
                    await fetchAnnouncements();
                    setDeleteConfirmOpen(false);
                    setSelectedAnnouncement(null);
                  } catch (error: any) {
                    console.error(error);
                    toast.error('Failed to delete announcement');
                  }
                }}
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

