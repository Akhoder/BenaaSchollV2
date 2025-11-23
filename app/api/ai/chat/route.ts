import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  studentContext?: {
    enrolledClasses?: Array<{ id: string; name: string }>;
    subjects?: Array<{ id: string; name: string }>;
    averageGrade?: number | null;
    upcomingAssignments?: Array<{ id: string; title: string; due_date: string }>;
  };
}

// Helper function to get student context
async function getStudentContext(userId: string, supabase: any) {
  try {
    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('class_id, classes!inner(id, class_name)')
      .eq('student_id', userId)
      .eq('status', 'active');

    const enrolledClasses = (enrollments || []).map((e: any) => ({
      id: e.classes.id,
      name: e.classes.class_name,
    }));

    // Get subjects
    const classIds = enrolledClasses.map((c: any) => c.id);
    let subjects: any[] = [];
    if (classIds.length > 0) {
      const { data: classSubjects } = await supabase
        .from('class_subjects')
        .select('id, subject_name')
        .in('class_id', classIds);
      subjects = (classSubjects || []).map((s: any) => ({
        id: s.id,
        name: s.subject_name,
      }));
    }

    // Get average grade (mock for now, can be calculated from actual grades)
    const averageGrade = null;

    // Get upcoming assignments
    const subjectIds = subjects.map((s: any) => s.id);
    let upcomingAssignments: any[] = [];
    if (subjectIds.length > 0) {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date')
        .in('subject_id', subjectIds)
        .eq('status', 'published')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);
      upcomingAssignments = (assignments || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        due_date: a.due_date,
      }));
    }

    return {
      enrolledClasses,
      subjects,
      averageGrade,
      upcomingAssignments,
    };
  } catch (error) {
    console.error('Error fetching student context:', error);
    return {
      enrolledClasses: [],
      subjects: [],
      averageGrade: null,
      upcomingAssignments: [],
    };
  }
}

// Helper function to call AI API
async function callAI(messages: ChatMessage[], studentContext: any, language: string = 'ar') {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  // Prefer Gemini if available (free tier), otherwise use OpenAI
  const useGemini = !!geminiKey;
  const apiKey = useGemini ? geminiKey : openaiKey;

  if (!apiKey) {
    throw new Error('AI API key not configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in environment variables.');
  }

  // Build system prompt based on language
  const systemPrompts: Record<string, string> = {
    ar: `أنت مساعد ذكي لطالب في نظام إدارة مدرسة. مهمتك هي مساعدة الطالب في:
- الإجابة على الأسئلة الأكاديمية
- شرح المفاهيم الصعبة
- تقديم تلميحات للواجبات (بدون حل مباشر)
- مساعدة في تخطيط الدراسة
- تحليل الأداء الأكاديمي

السياق الحالي للطالب:
${studentContext.enrolledClasses.length > 0 ? `الفصول المسجل فيها: ${studentContext.enrolledClasses.map((c: any) => c.name).join(', ')}` : 'لا توجد فصول مسجل فيها'}
${studentContext.subjects.length > 0 ? `المواد الدراسية: ${studentContext.subjects.map((s: any) => s.name).join(', ')}` : 'لا توجد مواد'}
${studentContext.averageGrade ? `المتوسط الحالي: ${studentContext.averageGrade}` : ''}
${studentContext.upcomingAssignments.length > 0 ? `الواجبات القادمة: ${studentContext.upcomingAssignments.map((a: any) => `${a.title} (${a.due_date})`).join(', ')}` : ''}

كن مفيداً، ودوداً، ومحترفاً. اكتب بالعربية.`,
    en: `You are an intelligent assistant for a student in a school management system. Your task is to help the student with:
- Answering academic questions
- Explaining difficult concepts
- Providing hints for assignments (without direct solutions)
- Helping with study planning
- Analyzing academic performance

Current student context:
${studentContext.enrolledClasses.length > 0 ? `Enrolled classes: ${studentContext.enrolledClasses.map((c: any) => c.name).join(', ')}` : 'No enrolled classes'}
${studentContext.subjects.length > 0 ? `Subjects: ${studentContext.subjects.map((s: any) => s.name).join(', ')}` : 'No subjects'}
${studentContext.averageGrade ? `Current average: ${studentContext.averageGrade}` : ''}
${studentContext.upcomingAssignments.length > 0 ? `Upcoming assignments: ${studentContext.upcomingAssignments.map((a: any) => `${a.title} (${a.due_date})`).join(', ')}` : ''}

Be helpful, friendly, and professional. Write in English.`,
    fr: `Vous êtes un assistant intelligent pour un étudiant dans un système de gestion scolaire. Votre tâche est d'aider l'étudiant avec:
- Répondre aux questions académiques
- Expliquer les concepts difficiles
- Fournir des indices pour les devoirs (sans solutions directes)
- Aider à la planification des études
- Analyser les performances académiques

Contexte actuel de l'étudiant:
${studentContext.enrolledClasses.length > 0 ? `Classes inscrites: ${studentContext.enrolledClasses.map((c: any) => c.name).join(', ')}` : 'Aucune classe inscrite'}
${studentContext.subjects.length > 0 ? `Matières: ${studentContext.subjects.map((s: any) => s.name).join(', ')}` : 'Aucune matière'}
${studentContext.averageGrade ? `Moyenne actuelle: ${studentContext.averageGrade}` : ''}
${studentContext.upcomingAssignments.length > 0 ? `Devoirs à venir: ${studentContext.upcomingAssignments.map((a: any) => `${a.title} (${a.due_date})`).join(', ')}` : ''}

Soyez utile, amical et professionnel. Écrivez en français.`,
  };

  const systemPrompt = systemPrompts[language] || systemPrompts.ar;

  if (useGemini) {
    // Use Google Gemini API - Try multiple model names and API versions
    try {
      // List of models to try in order of preference (based on available models)
      const modelsToTry = [
        { name: 'gemini-2.5-flash', version: 'v1' },      // Latest and fastest
        { name: 'gemini-2.5-pro', version: 'v1' },        // Latest and most powerful
        { name: 'gemini-2.0-flash', version: 'v1' },      // Fast and stable
        { name: 'gemini-2.0-flash-001', version: 'v1' },  // Stable version
        { name: 'gemini-2.5-flash-lite', version: 'v1' }, // Lightweight
        { name: 'gemini-2.0-flash-lite-001', version: 'v1' }, // Lightweight stable
        // Fallback to older models if available
        { name: 'gemini-pro', version: 'v1' },
        { name: 'gemini-1.0-pro', version: 'v1' },
        { name: 'gemini-1.5-flash', version: 'v1' },
        { name: 'gemini-1.5-pro', version: 'v1' },
        { name: 'gemini-pro', version: 'v1beta' },
        { name: 'gemini-1.0-pro', version: 'v1beta' },
      ];

      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemPrompt}\n\n${messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}`,
                    },
                  ],
                },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (result) {
              console.log(`Successfully used model: ${model.name} (${model.version})`);
              return result;
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            lastError = errorData;
            console.log(`Model ${model.name} (${model.version}) not available, trying next...`);
            // Continue to next model
          }
        } catch (err: any) {
          lastError = err;
          console.log(`Error with model ${model.name} (${model.version}):`, err.message);
          // Continue to next model
        }
      }

      // If all models failed, throw the last error
      throw new Error(`All Gemini models failed. Last error: ${JSON.stringify(lastError)}`);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw error;
    }
  } else {
    // Use OpenAI API with fallback to Gemini
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        
        // If quota exceeded or other error, try Gemini as fallback
        if (geminiKey && (errorData.error?.code === 'insufficient_quota' || errorData.error?.type === 'insufficient_quota')) {
          console.log('OpenAI quota exceeded, falling back to Gemini...');
          // Recursively call with Gemini
          return callAIWithGemini(messages, studentContext, language, geminiKey, systemPrompt);
        }
        
        throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error: any) {
      // If we have Gemini key and OpenAI failed, try Gemini
      if (geminiKey && !error.message?.includes('Gemini')) {
        console.log('OpenAI failed, trying Gemini as fallback...');
        try {
          return await callAIWithGemini(messages, studentContext, language, geminiKey, systemPrompt);
        } catch (geminiError: unknown) {
          const geminiMessage = geminiError instanceof Error ? geminiError.message : String(geminiError);
          throw new Error(`Both OpenAI and Gemini failed. OpenAI: ${error.message}, Gemini: ${geminiMessage}`);
        }
      }
      throw error;
    }
  }
}

// Helper function to call Gemini API
async function callAIWithGemini(
  messages: ChatMessage[],
  studentContext: any,
  language: string,
  geminiKey: string,
  systemPrompt: string
): Promise<string> {
  // List of models to try in order of preference (based on available models)
  const modelsToTry = [
    { name: 'gemini-2.5-flash', version: 'v1' },      // Latest and fastest
    { name: 'gemini-2.5-pro', version: 'v1' },        // Latest and most powerful
    { name: 'gemini-2.0-flash', version: 'v1' },      // Fast and stable
    { name: 'gemini-2.0-flash-001', version: 'v1' },  // Stable version
    { name: 'gemini-2.5-flash-lite', version: 'v1' }, // Lightweight
    { name: 'gemini-2.0-flash-lite-001', version: 'v1' }, // Lightweight stable
    // Fallback to older models if available
    { name: 'gemini-pro', version: 'v1' },
    { name: 'gemini-1.0-pro', version: 'v1' },
    { name: 'gemini-1.5-flash', version: 'v1' },
    { name: 'gemini-1.5-pro', version: 'v1' },
    { name: 'gemini-pro', version: 'v1beta' },
    { name: 'gemini-1.0-pro', version: 'v1beta' },
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (result) {
          console.log(`Successfully used model: ${model.name} (${model.version})`);
          return result;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = errorData;
        // Continue to next model
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next model
    }
  }

  // If all models failed, throw the last error
  throw new Error(`All Gemini models failed. Last error: ${JSON.stringify(lastError)}`);
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

    // Check if user is a student
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role, language_preference')
      .eq('id', user.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'This feature is only available for students' }, { status: 403 });
    }

    const body: ChatRequest = await request.json();
    const { message, conversationId, studentContext: providedContext } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get student context if not provided
    let studentContext = providedContext;
    if (!studentContext) {
      studentContext = await getStudentContext(user.user.id, userClient);
    }

    // Get conversation history if conversationId is provided
    let conversationHistory: ChatMessage[] = [];
    if (conversationId) {
      const { data: messages } = await userClient
        .from('ai_chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20); // Last 20 messages for context

      conversationHistory = (messages || []).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    }

    // Add current message
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Call AI
    const aiResponse = await callAI(messages, studentContext, profile.language_preference || 'ar');

    // Save messages to database
    const finalConversationId = conversationId || crypto.randomUUID();
    
    // Save user message
    await userClient.from('ai_chat_messages').insert({
      conversation_id: finalConversationId,
      user_id: user.user.id,
      role: 'user',
      content: message,
    });

    // Save assistant response
    await userClient.from('ai_chat_messages').insert({
      conversation_id: finalConversationId,
      user_id: user.user.id,
      role: 'assistant',
      content: aiResponse,
    });

    // Update or create conversation
    await userClient
      .from('ai_conversations')
      .upsert({
        id: finalConversationId,
        user_id: user.user.id,
        title: message.substring(0, 50), // Use first 50 chars as title
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    return NextResponse.json({
      response: aiResponse,
      conversationId: finalConversationId,
    });
  } catch (error: any) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

