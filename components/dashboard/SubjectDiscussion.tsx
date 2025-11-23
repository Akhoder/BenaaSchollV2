'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TranslationKey } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ensureSubjectConversation, getConversationMessages, sendMessage, subscribeToMessages, updateMessage, deleteMessage } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Edit, Trash2, MoreVertical, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SubjectDiscussionVariant = 'sheet' | 'card';

interface SubjectDiscussionProps {
  subjectId: string;
  subjectName: string;
  t: (key: TranslationKey) => string;
  dateLocale: string;
  currentUserId: string;
  currentUserRole?: 'admin' | 'teacher' | 'student';
  className?: string;
  variant?: SubjectDiscussionVariant;
  maxMessages?: number;
}

export function SubjectDiscussion({
  subjectId,
  subjectName,
  t,
  dateLocale,
  currentUserId,
  currentUserRole,
  className,
  variant = 'sheet',
  maxMessages = 50,
}: SubjectDiscussionProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingDiscussion, setLoadingDiscussion] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const scrollableMaxHeight = useMemo(() => (variant === 'sheet' ? undefined : 'max-h-[420px]'), [variant]);

  const loadDiscussion = useCallback(async () => {
    setLoadingDiscussion(true);
    try {
      const { data, error } = await ensureSubjectConversation(subjectId);
      const conversationRow = Array.isArray(data) ? data[0] : data;
      if (error || !conversationRow?.conversation_id) {
        toast.error(t('errorLoadingClass' as TranslationKey));
        setLoadingDiscussion(false);
        return;
      }
      const convId = conversationRow.conversation_id as string;
      setConversationId(convId);
      const { data: msgs, error: msgsErr } = await getConversationMessages(convId, maxMessages);
      if (!msgsErr) {
        setMessages(msgs || []);
      }
    } catch (err) {
      console.error('Error loading discussion:', err);
      toast.error(t('errorOccurred' as TranslationKey));
    } finally {
      setLoadingDiscussion(false);
    }
  }, [maxMessages, subjectId, t]);

  useEffect(() => {
    loadDiscussion().catch(() => {});
  }, [loadDiscussion]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    });
    return () => {
      unsubscribe?.();
    };
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if (!conversationId || !messageInput.trim()) return;
    try {
      setSendingMessage(true);
      const { error } = await sendMessage(conversationId, messageInput.trim(), 'text');
      if (error) {
        toast.error(t('errorOccurred' as TranslationKey));
        return;
      }
      setMessageInput('');
      await loadDiscussion();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('errorOccurred' as TranslationKey));
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, messageInput, t, loadDiscussion]);

  const handleEditMessage = useCallback((message: any) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editContent.trim()) return;
    try {
      const { error } = await updateMessage(editingMessageId, editContent.trim());
      if (error) {
        toast.error(t('errorOccurred' as TranslationKey));
        return;
      }
      toast.success(t('saved' as TranslationKey));
      setEditingMessageId(null);
      setEditContent('');
      await loadDiscussion();
    } catch (err) {
      console.error('Error updating message:', err);
      toast.error(t('errorOccurred' as TranslationKey));
    }
  }, [editingMessageId, editContent, t, loadDiscussion]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!confirm(t('confirmDeleteMessage' as TranslationKey))) return;
    try {
      setDeletingMessageId(messageId);
      const { error } = await deleteMessage(messageId);
      if (error) {
        toast.error(t('errorOccurred' as TranslationKey));
        return;
      }
      toast.success(t('deleted' as TranslationKey));
      await loadDiscussion();
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error(t('errorOccurred' as TranslationKey));
    } finally {
      setDeletingMessageId(null);
    }
  }, [t, loadDiscussion]);

  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{t('subjectDiscussion' as TranslationKey)}</h3>
          <p className="text-sm text-muted-foreground">{subjectName}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadDiscussion} disabled={loadingDiscussion}>
          {t('refreshPage' as TranslationKey)}
        </Button>
      </div>
      <div
        className={cn(
          'flex-1 space-y-4 overflow-y-auto pr-2',
          scrollableMaxHeight,
          variant === 'card' && 'rounded-xl border bg-muted/20 p-4 dark:border-slate-800'
        )}
      >
        {loadingDiscussion ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <div key={`discussion-skeleton-${idx}`} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMessagesYet' as TranslationKey)}</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            const isDeleted = msg.is_deleted;
            const isEditing = editingMessageId === msg.id;
            const isAdmin = currentUserRole === 'admin';
            const canEdit = isOwn && !isDeleted;
            const canDelete = (isAdmin || isOwn) && !isDeleted;
            const showMenu = canEdit || canDelete;
            
            return (
              <div
                key={msg.id}
                className={cn(
                  'group relative rounded-2xl border px-4 py-3 text-sm shadow-sm',
                  isOwn
                    ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{msg.sender?.full_name || t('unknownUser' as TranslationKey)}</span>
                    {msg.sender?.role && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          msg.sender.role === 'admin' && 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
                          msg.sender.role === 'teacher' && 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
                          msg.sender.role === 'student' && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        )}
                      >
                        {msg.sender.role === 'admin' && t('roleAdmin' as TranslationKey)}
                        {msg.sender.role === 'teacher' && t('roleTeacher' as TranslationKey)}
                        {msg.sender.role === 'student' && t('roleStudent' as TranslationKey)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {showMenu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEditMessage(msg)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('edit' as TranslationKey)}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-destructive"
                              disabled={deletingMessageId === msg.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete' as TranslationKey)}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString(dateLocale, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {msg.is_edited && !isDeleted && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({t('edited' as TranslationKey)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim()}
                      >
                        {t('save' as TranslationKey)}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditContent('');
                        }}
                      >
                        {t('cancel' as TranslationKey)}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isDeleted ? (
                      <p className="italic text-muted-foreground text-sm">
                        {msg.deleted_by_user ? (
                          <>
                            {msg.deleted_by_user.id === msg.sender_id ? (
                              t('messageDeletedBySelf' as TranslationKey)
                            ) : (
                              <>
                                {t('messageDeletedBy' as TranslationKey)}{' '}
                                <span className="font-medium">
                                  {msg.deleted_by_user.full_name}
                                </span>
                                {msg.deleted_by_user.role && (
                                  <span className="ml-1">
                                    ({msg.deleted_by_user.role === 'admin' && t('roleAdmin' as TranslationKey)}
                                    {msg.deleted_by_user.role === 'teacher' && t('roleTeacher' as TranslationKey)}
                                    {msg.deleted_by_user.role === 'student' && t('roleStudent' as TranslationKey)})
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          t('messageDeleted' as TranslationKey)
                        )}
                      </p>
                    ) : (
                      <p className="whitespace-pre-line text-slate-700 dark:text-slate-200">
                        {msg.content}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={t('writeMessage' as TranslationKey)}
          rows={variant === 'sheet' ? 3 : 4}
          className="resize-none"
        />
        <Button onClick={handleSend} disabled={!messageInput.trim() || sendingMessage || !conversationId}>
          {sendingMessage ? t('sendingMessage' as TranslationKey) : t('sendMessageButton' as TranslationKey)}
        </Button>
      </div>
    </div>
  );
}

