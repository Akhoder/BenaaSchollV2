'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
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
import type { TranslationKey } from '@/lib/translations';

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

  const fetchAnnouncements = useCallback(async () => {
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
      toast.error(t('failedToLoadAnnouncements' as TranslationKey));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
  }, [profile, authLoading, router, fetchAnnouncements]);

  const canCreate = useMemo(() => profile && ['admin', 'teacher', 'supervisor'].includes(profile.role), [profile]);
  const canEdit = useCallback((ann: Announcement) => 
    profile && (profile.role === 'admin' || ann.author_id === profile.id), [profile]);
  const canDelete = useMemo(() => profile && profile.role === 'admin', [profile]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
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
  }, [announcements, searchQuery, roleFilter, profile]);

  const stats = useMemo(() => ({
    total: announcements.length,
    published: announcements.filter(a => a.is_published).length,
    drafts: announcements.filter(a => !a.is_published).length,
    myAnnouncements: announcements.filter(a => a.author_id === profile?.id).length,
  }), [announcements, profile?.id]);

  const getRoleColor = useCallback((role: string, isSelected: boolean) => {
    if (!isSelected) return "bg-muted text-muted-foreground hover:bg-muted/80";
    
    switch (role) {
      case 'admin':
        return 'bg-error/10 text-error border-error/30';
      case 'teacher':
        return 'bg-info/10 text-info border-info/30';
      case 'student':
        return 'bg-success/10 text-success border-success/30';
      case 'supervisor':
        return 'bg-accent/10 text-accent border-accent/30';
      default:
        return 'bg-primary/10 text-primary border-primary/30';
    }
  }, []);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loadingAnnouncements' as TranslationKey)} />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={Megaphone}
          title={t('announcements')}
          description={t('announcementsDescription' as TranslationKey)}
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
              className="shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createAnnouncement' as TranslationKey)}
            </Button>
          )}
        </PageHeader>

        {/* ✨ Stats Cards - Islamic Design */}
        {(profile.role === 'admin' || stats.myAnnouncements > 0) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
            {/* Total Announcements */}
            <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('totalAnnouncements' as TranslationKey)}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary font-display">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('total')}</p>
              </CardContent>
            </Card>

            {/* Published */}
            <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('publishedAnnouncements' as TranslationKey)}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success font-display">{stats.published}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('published' as TranslationKey)}</p>
              </CardContent>
            </Card>

            {/* Drafts */}
            <Card className="glass-card-hover border-primary/10 hover:border-warning/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('draftAnnouncements' as TranslationKey)}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-warning to-warning/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <EyeOff className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning font-display">{stats.drafts}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('draft' as TranslationKey)}</p>
              </CardContent>
            </Card>

            {/* My Announcements */}
            {profile?.role !== 'student' && (
              <Card className="glass-card-hover border-primary/10 hover:border-accent/30 transition-all duration-300 group">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    {t('myAnnouncements' as TranslationKey)}
                  </CardTitle>
                  <div className="p-2.5 bg-gradient-to-br from-accent to-secondary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent font-display">{stats.myAnnouncements}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('myAnnouncements' as TranslationKey)}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ✨ Search and Filter - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              {t('searchAndFilter' as TranslationKey)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-primary/10 rounded-lg group-focus-within:bg-primary/20 transition-colors">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <Input
                    placeholder={t('searchAnnouncements' as TranslationKey)}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              {profile?.role !== 'student' && (
                <div className="w-full md:w-56">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-primary" />
                          {t('all' as TranslationKey)}
                        </div>
                      </SelectItem>
                      <SelectItem value="published">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-success" />
                          {t('published' as TranslationKey)}
                        </div>
                      </SelectItem>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <EyeOff className="h-4 w-4 text-warning" />
                          {t('draft' as TranslationKey)}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ✨ Announcements List - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <span className="text-primary font-display">{t('announcements' as TranslationKey)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredAnnouncements.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                {/* Empty State - Enhanced Design */}
                <div className="relative inline-block mb-6">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                    <Megaphone className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  {searchQuery ? t('noAnnouncementsFound' as TranslationKey) : t('noAnnouncementsYet' as TranslationKey)}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery ? t('tryAdjustingFilters') : t('noAnnouncementsYet' as TranslationKey)}
                </p>
                
                {/* Decorative Line */}
                <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((ann, index) => (
                  <Card
                    key={ann.id}
                    className={cn(
                      "glass-card border-primary/10 transition-all cursor-pointer animate-fade-in-up group",
                      "hover:shadow-xl hover:border-primary/30 hover:scale-[1.01]"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
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
                        <Avatar className="h-12 w-12 ring-2 ring-secondary/30 group-hover:ring-primary/50 transition-all">
                          <AvatarImage src={ann.author?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                            {ann.author?.full_name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-foreground font-display group-hover:text-primary transition-colors">{ann.title}</h3>
                              <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-accent" />
                                  <span>{ann.author?.full_name}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={ann.is_published ? 'success' : 'warning'}
                                className="gap-1.5"
                              >
                                {ann.is_published ? (
                                  <><Eye className="h-3 w-3" /> {t('published' as TranslationKey)}</>
                                ) : (
                                  <><EyeOff className="h-3 w-3" /> {t('draft' as TranslationKey)}</>
                                )}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-foreground/80 font-sans line-clamp-3 leading-relaxed">
                            {ann.content}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ann.target_roles.map(role => (
                              <Badge 
                                key={role} 
                                variant={
                                  role === 'admin' ? 'destructive' :
                                  role === 'teacher' ? 'info' :
                                  role === 'student' ? 'success' :
                                  'accent'
                                }
                                className="font-medium"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                          {(canEdit(ann) || canDelete) && (
                            <div className="flex gap-2 pt-3 border-t border-border/50">
                              {canEdit(ann) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDialogOpen(true);
                                  }}
                                  className="border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('edit' as TranslationKey)}
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
                                  className="border-error/30 text-error hover:bg-error/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('delete' as TranslationKey)}
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
                {selectedAnnouncement ? t('editAnnouncement' as TranslationKey) : t('createAnnouncement' as TranslationKey)}
              </DialogTitle>
              <DialogDescription className="font-sans">
                {selectedAnnouncement ? t('updateAnnouncementDetails' as TranslationKey) : t('shareImportantInformation' as TranslationKey)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium font-sans">{t('title' as TranslationKey)}</label>
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder={t('enterAnnouncementTitle' as TranslationKey)}
                  className="mt-1 font-sans"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">{t('body' as TranslationKey)}</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={t('enterAnnouncementContent' as TranslationKey)}
                  className="mt-1 w-full min-h-[120px] px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 font-sans"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">{t('targetRoles' as TranslationKey)}</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(['admin', 'teacher', 'student', 'supervisor'] as const).map(role => (
                    <Badge
                      key={role}
                      className={cn(
                        "cursor-pointer font-semibold transition-all hover:scale-105 border",
                        getRoleColor(role, editTargetRoles.includes(role))
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
                  <label className="text-sm font-medium font-sans">{t('publishImmediately' as TranslationKey)}</label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                {t('cancel' as TranslationKey)}
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
                      toast.success(t('announcementUpdated' as TranslationKey));
                    } else {
                      const { error } = await supabase
                        .from('announcements')
                        .insert([payload]);
                      if (error) throw error;
                      toast.success(t('announcementCreated' as TranslationKey));
                    }
                    await fetchAnnouncements();
                    setIsDialogOpen(false);
                    setSelectedAnnouncement(null);
                  } catch (error: any) {
                    console.error(error);
                    toast.error(t('failedToSaveAnnouncement' as TranslationKey));
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              >
                {savingEdit ? (selectedAnnouncement ? t('saving' as TranslationKey) : t('creating' as TranslationKey)) : (selectedAnnouncement ? t('saveChanges' as TranslationKey) : t('createAnnouncement' as TranslationKey))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('confirmDeletion' as TranslationKey)}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('deleteAnnouncementConfirm' as TranslationKey)}
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
                {t('cancel' as TranslationKey)}
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
                    toast.success(t('announcementDeleted' as TranslationKey));
                    await fetchAnnouncements();
                    setDeleteConfirmOpen(false);
                    setSelectedAnnouncement(null);
                  } catch (error: any) {
                    console.error(error);
                    toast.error(t('failedToDeleteAnnouncement' as TranslationKey));
                  }
                }}
                className="font-sans"
              >
                {t('delete' as TranslationKey)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

