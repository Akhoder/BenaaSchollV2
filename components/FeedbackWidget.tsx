'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star, Bug, Lightbulb, Send } from 'lucide-react';
import { collectFeedback } from '@/lib/analytics';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Feedback Widget Component
 * Phase 3 UX Improvement: User Testing and Iteration
 * Allows users to submit feedback, ratings, bug reports, and feature requests
 */

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'rating' | 'comment' | 'bug' | 'feature'>('comment');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { language } = useLanguage();

  const handleSubmit = async () => {
    if (!content.trim() && type !== 'rating') {
      toast.error(language === 'ar' ? 'الرجاء إدخال المحتوى' : 'Please enter content');
      return;
    }

    if (type === 'rating' && !rating) {
      toast.error(language === 'ar' ? 'الرجاء اختيار التقييم' : 'Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      const feedbackContent = type === 'rating' 
        ? `Rating: ${rating}/5` 
        : content;

      collectFeedback(type, feedbackContent, {
        rating,
        timestamp: new Date().toISOString(),
      });

      toast.success(
        language === 'ar' 
          ? 'شكراً لك على ملاحظاتك!' 
          : 'Thank you for your feedback!'
      );

      // Reset form
      setContent('');
      setRating(null);
      setOpen(false);
    } catch (error) {
      toast.error(
        language === 'ar' 
          ? 'فشل إرسال الملاحظات' 
          : 'Failed to submit feedback'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabels = {
    ar: {
      rating: 'تقييم',
      comment: 'تعليق',
      bug: 'بلاغ عن خطأ',
      feature: 'اقتراح ميزة',
    },
    en: {
      rating: 'Rating',
      comment: 'Comment',
      bug: 'Bug Report',
      feature: 'Feature Request',
    },
  };

  const labels = typeLabels[language as 'ar' | 'en'] || typeLabels.en;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-24 right-6 z-50 rounded-full shadow-lg min-h-[56px] min-w-[56px]"
          aria-label={language === 'ar' ? 'إرسال ملاحظات' : 'Send feedback'}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إرسال ملاحظات' : 'Send Feedback'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'شاركنا ملاحظاتك لمساعدتنا على التحسين' 
              : 'Share your feedback to help us improve'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={type} onValueChange={(value: any) => setType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  {labels.rating}
                </div>
              </SelectItem>
              <SelectItem value="comment">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {labels.comment}
                </div>
              </SelectItem>
              <SelectItem value="bug">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  {labels.bug}
                </div>
              </SelectItem>
              <SelectItem value="feature">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {labels.feature}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {type === 'rating' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'التقييم' : 'Rating'}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`
                      p-2 rounded-lg transition-colors min-h-[48px] min-w-[48px]
                      ${rating && star <= rating
                        ? 'text-warning bg-warning/10'
                        : 'text-muted-foreground hover:text-warning'
                      }
                    `}
                    aria-label={`${star} ${language === 'ar' ? 'نجمة' : 'stars'}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === 'ar' ? 'الملاحظات' : 'Feedback'}
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'اكتب ملاحظاتك هنا...'
                    : 'Write your feedback here...'
                }
                className="min-h-[120px]"
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إرسال' : 'Send'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

