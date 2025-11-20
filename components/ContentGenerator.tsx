'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, FileText, BookOpen, PenTool, Languages, Copy, Check, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ContentGeneratorProps {
  subjectId: string;
  subjectName: string;
  onQuestionsGenerated?: (questions: any[]) => void;
  onLessonPlanGenerated?: (lessonPlan: any) => void;
  onExercisesGenerated?: (exercises: any[]) => void;
}

export function ContentGenerator({
  subjectId,
  subjectName,
  onQuestionsGenerated,
  onLessonPlanGenerated,
  onExercisesGenerated,
}: ContentGeneratorProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [isOpen, setIsOpen] = useState(false);
  
  // Questions state
  const [questionTopic, setQuestionTopic] = useState('');
  const [questionLevel, setQuestionLevel] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  
  // Lesson plan state
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonLevel, setLessonLevel] = useState('medium');
  const [generatedLessonPlan, setGeneratedLessonPlan] = useState<any>(null);
  
  // Exercises state
  const [exerciseTopic, setExerciseTopic] = useState('');
  const [exerciseLevel, setExerciseLevel] = useState('medium');
  const [exerciseCount, setExerciseCount] = useState(5);
  const [generatedExercises, setGeneratedExercises] = useState<any[]>([]);
  
  // Translation state
  const [contentToTranslate, setContentToTranslate] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translatedContent, setTranslatedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateQuestions = async () => {
    if (!questionTopic.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال موضوع السؤال' : 'Please enter a topic');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'questions',
          subjectId,
          subjectName,
          topic: questionTopic,
          level: questionLevel,
          count: questionCount,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const result = await response.json();
      setGeneratedQuestions(result.data || []);
      onQuestionsGenerated?.(result.data || []);
      toast.success(language === 'ar' ? 'تم توليد الأسئلة بنجاح' : 'Questions generated successfully');
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error(language === 'ar' ? 'فشل توليد الأسئلة' : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const generateLessonPlan = async () => {
    if (!lessonTopic.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال موضوع الدرس' : 'Please enter a topic');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'lesson_plan',
          subjectId,
          subjectName,
          topic: lessonTopic,
          level: lessonLevel,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate lesson plan');
      }

      const result = await response.json();
      setGeneratedLessonPlan(result.data);
      onLessonPlanGenerated?.(result.data);
      toast.success(language === 'ar' ? 'تم توليد خطة الدرس بنجاح' : 'Lesson plan generated successfully');
    } catch (error: any) {
      console.error('Error generating lesson plan:', error);
      toast.error(language === 'ar' ? 'فشل توليد خطة الدرس' : 'Failed to generate lesson plan');
    } finally {
      setLoading(false);
    }
  };

  const generateExercises = async () => {
    if (!exerciseTopic.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال موضوع التمرين' : 'Please enter a topic');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'exercises',
          subjectId,
          subjectName,
          topic: exerciseTopic,
          level: exerciseLevel,
          count: exerciseCount,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate exercises');
      }

      const result = await response.json();
      setGeneratedExercises(result.data || []);
      onExercisesGenerated?.(result.data || []);
      toast.success(language === 'ar' ? 'تم توليد التمارين بنجاح' : 'Exercises generated successfully');
    } catch (error: any) {
      console.error('Error generating exercises:', error);
      toast.error(language === 'ar' ? 'فشل توليد التمارين' : 'Failed to generate exercises');
    } finally {
      setLoading(false);
    }
  };

  const translateContent = async () => {
    if (!contentToTranslate.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال المحتوى للترجمة' : 'Please enter content to translate');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'translate',
          content: contentToTranslate,
          targetLanguage,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate content');
      }

      const result = await response.json();
      setTranslatedContent(result.data.translated || '');
      toast.success(language === 'ar' ? 'تم الترجمة بنجاح' : 'Translation completed successfully');
    } catch (error: any) {
      console.error('Error translating content:', error);
      toast.error(language === 'ar' ? 'فشل الترجمة' : 'Failed to translate content');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(language === 'ar' ? 'تم النسخ' : 'Copied to clipboard');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "border transition-all duration-300",
        isOpen ? "border-primary/30 shadow-lg" : "border-border/50 hover:border-primary/20"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-all",
                  isOpen ? "bg-primary/10" : "bg-muted"
                )}>
                  <Wand2 className={cn(
                    "h-5 w-5 transition-all",
                    isOpen ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {language === 'ar' ? 'مولد المحتوى الذكي' : 'AI Content Generator'}
                    <Badge variant="secondary" className="text-xs">
                      {language === 'ar' ? 'جديد' : 'New'}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'ar' 
                      ? 'توليد أسئلة، خطط دروس، تمارين وترجمة'
                      : 'Generate questions, lesson plans, exercises & translate'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="questions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{language === 'ar' ? 'أسئلة' : 'Questions'}</span>
            </TabsTrigger>
            <TabsTrigger value="lesson" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{language === 'ar' ? 'خطة درس' : 'Lesson'}</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <PenTool className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{language === 'ar' ? 'تمارين' : 'Exercises'}</span>
            </TabsTrigger>
            <TabsTrigger value="translate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Languages className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{language === 'ar' ? 'ترجمة' : 'Translate'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'الموضوع' : 'Topic'}
                </label>
                <Input
                  value={questionTopic}
                  onChange={(e) => setQuestionTopic(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل موضوع السؤال' : 'Enter question topic'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'المستوى' : 'Level'}
                </label>
                <Select value={questionLevel} onValueChange={setQuestionLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{language === 'ar' ? 'سهل' : 'Easy'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="hard">{language === 'ar' ? 'صعب' : 'Hard'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'عدد الأسئلة' : 'Count'}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
            <Button 
              onClick={generateQuestions} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري التوليد...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'توليد الأسئلة' : 'Generate Questions'}
                </>
              )}
            </Button>

            {generatedQuestions.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">
                  {language === 'ar' ? 'الأسئلة المولدة' : 'Generated Questions'}
                </h3>
                {generatedQuestions.map((q, index) => (
                  <Card key={index} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">
                          {q.type === 'mcq' ? (language === 'ar' ? 'اختيار من متعدد' : 'MCQ') :
                           q.type === 'true_false' ? (language === 'ar' ? 'صح/خطأ' : 'True/False') :
                           language === 'ar' ? 'مقالي' : 'Essay'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(q, null, 2))}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="font-medium mb-2">{q.question}</p>
                      {q.options && (
                        <ul className="list-disc list-inside mb-2 text-sm text-muted-foreground">
                          {q.options.map((opt: string, i: number) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct Answer:'}</span>{' '}
                        {q.correct_answer}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lesson Plan Tab */}
          <TabsContent value="lesson" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'موضوع الدرس' : 'Lesson Topic'}
                </label>
                <Input
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل موضوع الدرس' : 'Enter lesson topic'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'المستوى' : 'Level'}
                </label>
                <Select value={lessonLevel} onValueChange={setLessonLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{language === 'ar' ? 'سهل' : 'Easy'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="hard">{language === 'ar' ? 'صعب' : 'Hard'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={generateLessonPlan} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري التوليد...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'توليد خطة الدرس' : 'Generate Lesson Plan'}
                </>
              )}
            </Button>

            {generatedLessonPlan && (
              <Card className="mt-6 border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{generatedLessonPlan.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'المدة:' : 'Duration:'} {generatedLessonPlan.duration}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(generatedLessonPlan, null, 2))}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedLessonPlan.objectives && generatedLessonPlan.objectives.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'ar' ? 'الأهداف' : 'Objectives'}</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {generatedLessonPlan.objectives.map((obj: string, i: number) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {generatedLessonPlan.steps && generatedLessonPlan.steps.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'ar' ? 'خطوات الدرس' : 'Lesson Steps'}</h4>
                      <div className="space-y-3">
                        {generatedLessonPlan.steps.map((step: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-muted">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{step.step}</Badge>
                              <span className="text-sm text-muted-foreground">{step.duration}</span>
                            </div>
                            <p className="text-sm">{step.description}</p>
                            {step.activities && step.activities.length > 0 && (
                              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                                {step.activities.map((act: string, j: number) => (
                                  <li key={j}>{act}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {generatedLessonPlan.assessment && (
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'ar' ? 'التقييم' : 'Assessment'}</h4>
                      <p className="text-sm">{generatedLessonPlan.assessment}</p>
                    </div>
                  )}
                  {generatedLessonPlan.homework && (
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'ar' ? 'الواجب المنزلي' : 'Homework'}</h4>
                      <p className="text-sm">{generatedLessonPlan.homework}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'الموضوع' : 'Topic'}
                </label>
                <Input
                  value={exerciseTopic}
                  onChange={(e) => setExerciseTopic(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل موضوع التمرين' : 'Enter exercise topic'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'المستوى' : 'Level'}
                </label>
                <Select value={exerciseLevel} onValueChange={setExerciseLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{language === 'ar' ? 'سهل' : 'Easy'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="hard">{language === 'ar' ? 'صعب' : 'Hard'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'عدد التمارين' : 'Count'}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
            <Button 
              onClick={generateExercises} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري التوليد...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'توليد التمارين' : 'Generate Exercises'}
                </>
              )}
            </Button>

            {generatedExercises.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">
                  {language === 'ar' ? 'التمارين المولدة' : 'Generated Exercises'}
                </h3>
                {generatedExercises.map((ex, index) => (
                  <Card key={index} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{ex.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(ex, null, 2))}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm mb-2">{ex.description}</p>
                      <details className="mt-2">
                        <summary className="text-sm font-medium cursor-pointer">
                          {language === 'ar' ? 'الحل' : 'Solution'}
                        </summary>
                        <p className="text-sm text-muted-foreground mt-2">{ex.solution}</p>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Translate Tab */}
          <TabsContent value="translate" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'ar' ? 'المحتوى للترجمة' : 'Content to Translate'}
              </label>
              <Textarea
                value={contentToTranslate}
                onChange={(e) => setContentToTranslate(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل المحتوى للترجمة...' : 'Enter content to translate...'}
                rows={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'ar' ? 'اللغة الهدف' : 'Target Language'}
              </label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{language === 'ar' ? 'العربية' : 'Arabic'}</SelectItem>
                  <SelectItem value="en">{language === 'ar' ? 'الإنجليزية' : 'English'}</SelectItem>
                  <SelectItem value="fr">{language === 'ar' ? 'الفرنسية' : 'French'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={translateContent} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري الترجمة...' : 'Translating...'}
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'ترجمة' : 'Translate'}
                </>
              )}
            </Button>

            {translatedContent && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {language === 'ar' ? 'المحتوى المترجم' : 'Translated Content'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(translatedContent)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Card className="border">
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap">{translatedContent}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  );
}

