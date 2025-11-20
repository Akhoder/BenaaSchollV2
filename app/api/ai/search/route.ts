import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  filters?: {
    type?: 'all' | 'students' | 'classes' | 'subjects' | 'assignments' | 'announcements';
    role?: string;
  };
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  description?: string;
  url: string;
  relevance: number;
}

// Helper function to search using AI for semantic understanding
async function enhanceSearchWithAI(query: string, language: string = 'ar'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return query; // Return original query if no API key

  const useGemini = !!process.env.GEMINI_API_KEY;

  try {
    if (useGemini) {
      // Use Gemini to understand search intent
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: language === 'ar'
                  ? `افهم نية البحث التالية وقدم كلمات مفتاحية محسّنة للبحث في نظام مدرسي:\n\n"${query}"\n\nأرجع فقط الكلمات المفتاحية المحسّنة بدون شرح.`
                  : language === 'fr'
                  ? `Comprenez l'intention de recherche suivante et fournissez des mots-clés optimisés pour rechercher dans un système scolaire:\n\n"${query}"\n\nRetournez uniquement les mots-clés optimisés sans explication.`
                  : `Understand the search intent below and provide optimized keywords for searching in a school system:\n\n"${query}"\n\nReturn only the optimized keywords without explanation.`
              }]
            }]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return enhanced || query;
      }
    } else {
      // Use OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: language === 'ar'
              ? 'أنت مساعد بحث ذكي. فهم نية البحث وقدم كلمات مفتاحية محسّنة.'
              : 'You are an intelligent search assistant. Understand search intent and provide optimized keywords.'
          }, {
            role: 'user',
            content: `Search query: "${query}"\n\nProvide optimized keywords only, no explanation.`
          }],
          temperature: 0.3,
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        return enhanced || query;
      }
    }
  } catch (error) {
    console.error('AI search enhancement error:', error);
  }

  return query; // Fallback to original query
}

// Search students
async function searchStudents(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    let queryBuilder = supabase
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('role', 'student')
      .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
      .limit(10);

    // Apply role-based filtering
    if (role === 'teacher' || role === 'supervisor') {
      // Teachers/supervisors can only see students in their classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .or(`teacher_id.eq.${userId},supervisor_id.eq.${userId}`);

      if (classes && classes.length > 0) {
        const classIds = classes.map((c: any) => c.id);
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .in('class_id', classIds)
          .eq('status', 'active');

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e: any) => e.student_id);
          queryBuilder = queryBuilder.in('id', studentIds);
        } else {
          return []; // No students in their classes
        }
      } else {
        return []; // No classes assigned
      }
    }

    const { data: students, error: studentsError } = await queryBuilder;

    if (studentsError) {
      console.error('Error searching students:', studentsError);
      // Try simpler search as fallback
      try {
        const fallbackQuery = supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .eq('role', 'student')
          .ilike('full_name', `%${query}%`)
          .limit(10);
        
        const { data: fallbackStudents } = await fallbackQuery;
        if (fallbackStudents) {
          fallbackStudents.forEach((student: any) => {
            results.push({
              type: 'student',
              id: student.id,
              title: student.full_name,
              description: student.email,
              url: `/dashboard/students`,
              relevance: 50,
            });
          });
        }
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
      }
    } else if (students) {
      students.forEach((student: any) => {
        const relevance = calculateRelevance(student, query);
        results.push({
          type: 'student',
          id: student.id,
          title: student.full_name,
          description: student.email,
          url: `/dashboard/students`, // Students page - can be enhanced to link to specific student
          relevance,
        });
      });
    }
  } catch (error) {
    console.error('Error searching students:', error);
  }

  return results;
}

// Search classes
async function searchClasses(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    const levelNum = parseInt(query);
    let queryBuilder = supabase
      .from('classes')
      .select('id, class_name, level, teacher_id, supervisor_id')
      .ilike('class_name', searchPattern)
      .limit(10);
    
    // If query is a number, also search by level
    if (!isNaN(levelNum) && levelNum > 0) {
      queryBuilder = queryBuilder.or(`class_name.ilike.${searchPattern},level.eq.${levelNum}`);
    }

    // Apply role-based filtering
    if (role === 'teacher') {
      queryBuilder = queryBuilder.eq('teacher_id', userId);
    } else if (role === 'supervisor') {
      queryBuilder = queryBuilder.eq('supervisor_id', userId);
    } else if (role === 'student') {
      queryBuilder = queryBuilder.eq('published', true);
    }

    const { data: classes, error: classesError } = await queryBuilder;

    if (classesError) {
      console.error('Error searching classes:', classesError);
      // Try simpler search as fallback
      try {
        const fallbackQuery = supabase
          .from('classes')
          .select('id, class_name, level, teacher_id, supervisor_id')
          .ilike('class_name', `%${query}%`)
          .limit(10);
        
        const { data: fallbackClasses } = await fallbackQuery;
        if (fallbackClasses) {
          fallbackClasses.forEach((cls: any) => {
            results.push({
              type: 'class',
              id: cls.id,
              title: cls.class_name,
              description: `Level ${cls.level}`,
              url: `/dashboard/classes`,
              relevance: 50,
            });
          });
        }
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
      }
    } else if (classes) {
      classes.forEach((cls: any) => {
        const relevance = calculateRelevance(cls, query);
        results.push({
          type: 'class',
          id: cls.id,
          title: cls.class_name,
          description: `Level ${cls.level}`,
          url: `/dashboard/classes`, // Classes page - can be enhanced to link to specific class
          relevance,
        });
      });
    }
  } catch (error) {
    console.error('Error searching classes:', error);
  }

  return results;
}

// Search subjects
async function searchSubjects(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const { data: subjects, error: subjectsError } = await supabase
      .from('class_subjects')
      .select('id, subject_name, class_id')
      .ilike('subject_name', `%${query}%`)
      .limit(10);

    if (subjectsError) {
      console.error('Error searching subjects:', subjectsError);
    } else if (subjects) {
      subjects.forEach((subject: any) => {
        const relevance = calculateRelevance(subject, query);
        results.push({
          type: 'subject',
          id: subject.id,
          title: subject.subject_name,
          description: 'Subject',
          url: `/dashboard/subjects/${subject.id}/lessons`, // Use lessons page as default
          relevance,
        });
      });
    }
  } catch (error) {
    console.error('Error searching subjects:', error);
  }

  return results;
}

// Search assignments
async function searchAssignments(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    let queryBuilder = supabase
      .from('assignments')
      .select('id, title, description, subject_id')
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(10);

    if (role === 'student') {
      // Students can only see assignments for their enrolled subjects
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', userId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map((e: any) => e.class_id);
        const { data: subjects } = await supabase
          .from('class_subjects')
          .select('id')
          .in('class_id', classIds);

        if (subjects && subjects.length > 0) {
          const subjectIds = subjects.map((s: any) => s.id);
          queryBuilder = queryBuilder.in('subject_id', subjectIds);
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    const { data: assignments, error: assignmentsError } = await queryBuilder;

    if (assignmentsError) {
      console.error('Error searching assignments:', assignmentsError);
    } else if (assignments) {
      assignments.forEach((assignment: any) => {
        const relevance = calculateRelevance(assignment, query);
        results.push({
          type: 'assignment',
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || 'Assignment',
          url: `/dashboard/assignments/${assignment.id}`,
          relevance,
        });
      });
    }
  } catch (error) {
    console.error('Error searching assignments:', error);
  }

  return results;
}

// Calculate relevance score
function calculateRelevance(item: any, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Exact match gets highest score
  if (item.full_name?.toLowerCase() === queryLower || 
      item.class_name?.toLowerCase() === queryLower ||
      item.subject_name?.toLowerCase() === queryLower ||
      item.title?.toLowerCase() === queryLower) {
    score += 100;
  }

  // Starts with query
  if (item.full_name?.toLowerCase().startsWith(queryLower) ||
      item.class_name?.toLowerCase().startsWith(queryLower) ||
      item.subject_name?.toLowerCase().startsWith(queryLower) ||
      item.title?.toLowerCase().startsWith(queryLower)) {
    score += 50;
  }

  // Contains query
  if (item.full_name?.toLowerCase().includes(queryLower) ||
      item.class_name?.toLowerCase().includes(queryLower) ||
      item.subject_name?.toLowerCase().includes(queryLower) ||
      item.title?.toLowerCase().includes(queryLower)) {
    score += 25;
  }

  return score;
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

    const body: SearchRequest = await request.json();
    const { query, filters } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Use original query first, AI enhancement is optional and can cause issues
    // const enhancedQuery = await enhanceSearchWithAI(query.trim(), profile?.language_preference || 'ar');
    const enhancedQuery = query.trim(); // Use original query for now

    // Determine what to search
    const searchType = filters?.type || 'all';
    const allResults: SearchResult[] = [];

    // Search based on type - run searches in parallel for better performance
    const searchPromises: Promise<SearchResult[]>[] = [];

    if (searchType === 'all' || searchType === 'students') {
      searchPromises.push(searchStudents(userClient, enhancedQuery, user.user.id, profile?.role || 'student'));
    }

    if (searchType === 'all' || searchType === 'classes') {
      searchPromises.push(searchClasses(userClient, enhancedQuery, user.user.id, profile?.role || 'student'));
    }

    if (searchType === 'all' || searchType === 'subjects') {
      searchPromises.push(searchSubjects(userClient, enhancedQuery, user.user.id, profile?.role || 'student'));
    }

    if (searchType === 'all' || searchType === 'assignments') {
      searchPromises.push(searchAssignments(userClient, enhancedQuery, user.user.id, profile?.role || 'student'));
    }

    // Wait for all searches to complete
    const searchResults = await Promise.allSettled(searchPromises);
    
    searchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error('Search error:', result.reason);
      }
    });

    // Sort by relevance
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Limit results
    const limitedResults = allResults.slice(0, 20);

    // Log for debugging
    console.log(`Search query: "${query}" -> "${enhancedQuery}", found ${limitedResults.length} results`);

    return NextResponse.json({
      results: limitedResults,
      query: enhancedQuery,
      originalQuery: query,
      total: limitedResults.length,
    });
  } catch (error: any) {
    console.error('Intelligent Search API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

