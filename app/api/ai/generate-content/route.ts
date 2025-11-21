import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateContentRequest {
  type: 'questions' | 'lesson_plan' | 'exercises' | 'translate';
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  level?: string;
  count?: number;
  language?: string;
  targetLanguage?: string;
  content?: string;
}

// Call AI to generate content
async function callAI(prompt: string, language: string = 'ar'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const useGemini = !!process.env.GEMINI_API_KEY;

  try {
    if (useGemini) {
      // Try multiple Gemini models with fallback
      const models = [
        { name: 'gemini-2.5-flash', version: 'v1' },
        { name: 'gemini-2.0-flash', version: 'v1' },
        { name: 'gemini-1.5-flash', version: 'v1' },
        { name: 'gemini-1.5-pro', version: 'v1' },
        { name: 'gemini-1.0-pro', version: 'v1' },
      ];

      let lastError: any = null;

      for (const model of models) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }]
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            const generated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (generated) {
              return generated;
            }
          } else {
            const error = await response.json().catch(() => ({}));
            lastError = error;
            console.log(`Gemini model ${model.name} (${model.version}) failed:`, error);
          }
        } catch (error) {
          lastError = error;
          console.log(`Gemini model ${model.name} (${model.version}) error:`, error);
          continue;
        }
      }

      // If all Gemini models failed, try OpenAI if available
      if (process.env.OPENAI_API_KEY) {
        console.log('All Gemini models failed, trying OpenAI...');
        return await callOpenAI(prompt, apiKey);
      }

      throw new Error(`All Gemini models failed. Last error: ${JSON.stringify(lastError)}`);
    } else {
      // Use OpenAI
      return await callOpenAI(prompt, apiKey);
    }
  } catch (error: any) {
    console.error('AI API error:', error);
    throw error;
  }
}

// Helper function to call OpenAI
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Generate exam questions
async function generateQuestions(
  subjectName: string,
  topic: string,
  level: string,
  count: number,
  language: string
): Promise<any[]> {
  const prompt = language === 'ar'
    ? `أنت معلم محترف. قم بإنشاء ${count} سؤال امتحان ${level} للمادة "${subjectName}" حول موضوع "${topic}".

المتطلبات:
- تنوع في أنواع الأسئلة (اختيار من متعدد، صح/خطأ، مقالي قصير)
- كل سؤال يجب أن يكون واضحاً ومحدداً
- أضف الإجابات الصحيحة لكل سؤال
- الصعوبة: ${level}

قم بإرجاع النتائج بتنسيق JSON فقط بدون أي نص إضافي:
{
  "questions": [
    {
      "type": "mcq" | "true_false" | "short_answer",
      "question": "نص السؤال",
      "options": ["الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4"] (للسؤال الاختياري فقط),
      "correct_answer": "الإجابة الصحيحة",
      "points": 1
    }
  ]
}`
    : language === 'fr'
    ? `Vous êtes un enseignant professionnel. Créez ${count} questions d'examen de niveau ${level} pour la matière "${subjectName}" sur le sujet "${topic}".

Exigences:
- Variété dans les types de questions (choix multiples, vrai/faux, essai court)
- Chaque question doit être claire et spécifique
- Ajoutez les bonnes réponses pour chaque question
- Difficulté: ${level}

Retournez les résultats en format JSON uniquement sans texte supplémentaire:
{
  "questions": [
    {
      "type": "mcq" | "true_false" | "short_answer",
      "question": "Texte de la question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (pour MCQ uniquement),
      "correct_answer": "Bonne réponse",
      "points": 1
    }
  ]
}`
    : `You are a professional teacher. Create ${count} ${level} level exam questions for "${subjectName}" on the topic "${topic}".

Requirements:
- Variety in question types (multiple choice, true/false, short essay)
- Each question should be clear and specific
- Add correct answers for each question
- Difficulty: ${level}

Return results in JSON format only without any additional text:
{
  "questions": [
    {
      "type": "mcq" | "true_false" | "short_answer",
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (for MCQ only),
      "correct_answer": "Correct answer",
      "points": 1
    }
  ]
}`;

  const response = await callAI(prompt, language);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.questions || [];
    }
  } catch (error) {
    console.error('Error parsing questions JSON:', error);
  }

  // Fallback: parse manually if JSON parsing fails
  return [];
}

// Generate lesson plan
async function generateLessonPlan(
  subjectName: string,
  topic: string,
  level: string,
  language: string
): Promise<any> {
  const prompt = language === 'ar'
    ? `أنت معلم محترف. قم بإنشاء خطة درس مفصلة للمادة "${subjectName}" حول موضوع "${topic}" للمستوى ${level}.

المتطلبات:
- الأهداف التعليمية
- المواد المطلوبة
- خطوات الدرس (التمهيد، العرض، التطبيق، الختام)
- الأنشطة التفاعلية
- التقييم
- الواجبات المنزلية

قم بإرجاع النتائج بتنسيق JSON فقط:
{
  "title": "عنوان الدرس",
  "objectives": ["الهدف 1", "الهدف 2"],
  "materials": ["المادة 1", "المادة 2"],
  "duration": "45 دقيقة",
  "steps": [
    {
      "step": "التمهيد",
      "duration": "5 دقائق",
      "description": "وصف الخطوة",
      "activities": ["النشاط 1"]
    }
  ],
  "assessment": "طريقة التقييم",
  "homework": "الواجب المنزلي"
}`
    : language === 'fr'
    ? `Vous êtes un enseignant professionnel. Créez un plan de leçon détaillé pour la matière "${subjectName}" sur le sujet "${topic}" pour le niveau ${level}.

Exigences:
- Objectifs d'apprentissage
- Matériaux requis
- Étapes de la leçon (introduction, présentation, application, conclusion)
- Activités interactives
- Évaluation
- Devoirs

Retournez les résultats en format JSON uniquement:
{
  "title": "Titre de la leçon",
  "objectives": ["Objectif 1", "Objectif 2"],
  "materials": ["Matériel 1", "Matériel 2"],
  "duration": "45 minutes",
  "steps": [
    {
      "step": "Introduction",
      "duration": "5 minutes",
      "description": "Description de l'étape",
      "activities": ["Activité 1"]
    }
  ],
  "assessment": "Méthode d'évaluation",
  "homework": "Devoirs"
}`
    : `You are a professional teacher. Create a detailed lesson plan for "${subjectName}" on the topic "${topic}" for ${level} level.

Requirements:
- Learning objectives
- Required materials
- Lesson steps (introduction, presentation, application, conclusion)
- Interactive activities
- Assessment
- Homework

Return results in JSON format only:
{
  "title": "Lesson title",
  "objectives": ["Objective 1", "Objective 2"],
  "materials": ["Material 1", "Material 2"],
  "duration": "45 minutes",
  "steps": [
    {
      "step": "Introduction",
      "duration": "5 minutes",
      "description": "Step description",
      "activities": ["Activity 1"]
    }
  ],
  "assessment": "Assessment method",
  "homework": "Homework assignment"
}`;

  const response = await callAI(prompt, language);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing lesson plan JSON:', error);
  }

  return {
    title: topic,
    objectives: [],
    materials: [],
    duration: '45 minutes',
    steps: [],
    assessment: '',
    homework: ''
  };
}

// Generate exercises
async function generateExercises(
  subjectName: string,
  topic: string,
  level: string,
  count: number,
  language: string
): Promise<any[]> {
  const prompt = language === 'ar'
    ? `أنت معلم محترف. قم بإنشاء ${count} تمرين ${level} للمادة "${subjectName}" حول موضوع "${topic}".

المتطلبات:
- تمارين متنوعة (حسابية، تطبيقية، تحليلية)
- كل تمرين يجب أن يكون واضحاً مع أمثلة
- أضف الحلول لكل تمرين
- الصعوبة: ${level}

قم بإرجاع النتائج بتنسيق JSON فقط:
{
  "exercises": [
    {
      "title": "عنوان التمرين",
      "description": "وصف التمرين",
      "solution": "الحل",
      "points": 5
    }
  ]
}`
    : language === 'fr'
    ? `Vous êtes un enseignant professionnel. Créez ${count} exercices de niveau ${level} pour la matière "${subjectName}" sur le sujet "${topic}".

Exigences:
- Exercices variés (calcul, application, analyse)
- Chaque exercice doit être clair avec des exemples
- Ajoutez les solutions pour chaque exercice
- Difficulté: ${level}

Retournez les résultats en format JSON uniquement:
{
  "exercises": [
    {
      "title": "Titre de l'exercice",
      "description": "Description de l'exercice",
      "solution": "Solution",
      "points": 5
    }
  ]
}`
    : `You are a professional teacher. Create ${count} ${level} level exercises for "${subjectName}" on the topic "${topic}".

Requirements:
- Variety in exercises (calculations, applications, analysis)
- Each exercise should be clear with examples
- Add solutions for each exercise
- Difficulty: ${level}

Return results in JSON format only:
{
  "exercises": [
    {
      "title": "Exercise title",
      "description": "Exercise description",
      "solution": "Solution",
      "points": 5
    }
  ]
}`;

  const response = await callAI(prompt, language);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.exercises || [];
    }
  } catch (error) {
    console.error('Error parsing exercises JSON:', error);
  }

  return [];
}

// Translate content
async function translateContent(
  content: string,
  targetLanguage: string,
  sourceLanguage: string = 'ar'
): Promise<string> {
  const languageNames: Record<string, string> = {
    ar: 'العربية',
    en: 'English',
    fr: 'Français'
  };

  const prompt = `Translate the following educational content from ${languageNames[sourceLanguage]} to ${languageNames[targetLanguage]}. Maintain the educational tone and format:

${content}

Return only the translated content without any additional text.`;

  return await callAI(prompt, targetLanguage);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !anon) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: user, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await userClient
      .from('profiles')
      .select('role, language_preference')
      .eq('id', user.user.id)
      .single();

    // Only teachers and admins can generate content
    if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: GenerateContentRequest = await request.json();
    const { type, subjectName, topic, level, count, language, targetLanguage, content } = body;
    const userLanguage = language || profile?.language_preference || 'ar';

    try {
      switch (type) {
        case 'questions': {
          if (!subjectName || !topic) {
            return NextResponse.json({ error: 'Subject name and topic are required' }, { status: 400 });
          }
          const questions = await generateQuestions(
            subjectName,
            topic || '',
            level || 'medium',
            count || 5,
            userLanguage
          );
          return NextResponse.json({ data: questions });
        }

        case 'lesson_plan': {
          if (!subjectName || !topic) {
            return NextResponse.json({ error: 'Subject name and topic are required' }, { status: 400 });
          }
          const lessonPlan = await generateLessonPlan(
            subjectName,
            topic || '',
            level || 'medium',
            userLanguage
          );
          return NextResponse.json({ data: lessonPlan });
        }

        case 'exercises': {
          if (!subjectName || !topic) {
            return NextResponse.json({ error: 'Subject name and topic are required' }, { status: 400 });
          }
          const exercises = await generateExercises(
            subjectName,
            topic || '',
            level || 'medium',
            count || 5,
            userLanguage
          );
          return NextResponse.json({ data: exercises });
        }

        case 'translate': {
          if (!content || !targetLanguage) {
            return NextResponse.json({ error: 'Content and target language are required' }, { status: 400 });
          }
          const translated = await translateContent(content, targetLanguage, userLanguage);
          return NextResponse.json({ data: { translated } });
        }

        default:
          return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
    } catch (error: any) {
      console.error('Content generation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate content' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Generate Content API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

