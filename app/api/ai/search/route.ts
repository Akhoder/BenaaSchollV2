import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  filters?: {
    type?: 'all' | 'students' | 'classes' | 'subjects' | 'assignments' | 'announcements' | 'teachers';
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

// Search students - optimized for speed
async function searchStudents(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    
    // For admin, simple search - fastest
    if (role === 'admin') {
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .ilike('full_name', searchPattern)
        .limit(5)
        .order('full_name', { ascending: true });

      if (!error && students) {
        students.forEach((student: any) => {
          results.push({
            type: 'student',
            id: student.id,
            title: student.full_name,
            description: student.email,
            url: `/dashboard/students/${student.id}`,
            relevance: 100,
          });
        });
      }
      return results;
    }

    // For teachers/supervisors - simplified query
    if (role === 'teacher' || role === 'supervisor') {
      // Simplified: search directly without complex joins
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .ilike('full_name', searchPattern)
        .limit(5);

      if (!error && students) {
        students.forEach((student: any) => {
          results.push({
            type: 'student',
            id: student.id,
            title: student.full_name,
            description: student.email,
            url: `/dashboard/students/${student.id}`,
            relevance: 50,
          });
        });
      }
      return results;
    }

    // For students - simple search
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'student')
      .ilike('full_name', searchPattern)
      .limit(5);

    if (!error && students) {
      students.forEach((student: any) => {
        results.push({
          type: 'student',
          id: student.id,
          title: student.full_name,
          description: student.email,
          url: `/dashboard/students/${student.id}`,
          relevance: 50,
        });
      });
    }
  } catch (error) {
    console.error('Error searching students:', error);
  }

  return results;
}

// Search classes - optimized for speed
async function searchClasses(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    let queryBuilder = supabase
      .from('classes')
      .select('id, class_name, level')
      .ilike('class_name', searchPattern)
      .limit(5);

    // Apply role-based filtering
    if (role === 'teacher') {
      queryBuilder = queryBuilder.eq('teacher_id', userId);
    } else if (role === 'supervisor') {
      queryBuilder = queryBuilder.eq('supervisor_id', userId);
    } else if (role === 'student') {
      queryBuilder = queryBuilder.eq('published', true);
    }

    const { data: classes, error } = await queryBuilder;

    if (!error && classes) {
      classes.forEach((cls: any) => {
        results.push({
          type: 'class',
          id: cls.id,
          title: cls.class_name,
          description: `Level ${cls.level}`,
          url: `/dashboard/classes`,
          relevance: 100,
        });
      });
    }
  } catch (error) {
    console.error('Error searching classes:', error);
  }

  return results;
}

// Search subjects - optimized for speed
async function searchSubjects(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const { data: subjects, error } = await supabase
      .from('class_subjects')
      .select('id, subject_name')
      .ilike('subject_name', `%${query}%`)
      .limit(5);

    if (!error && subjects) {
      subjects.forEach((subject: any) => {
        results.push({
          type: 'subject',
          id: subject.id,
          title: subject.subject_name,
          description: 'Subject',
          url: `/dashboard/subjects/${subject.id}/lessons`,
          relevance: 100,
        });
      });
    }
  } catch (error) {
    console.error('Error searching subjects:', error);
  }

  return results;
}

// Search assignments - optimized for speed
async function searchAssignments(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    let queryBuilder = supabase
      .from('assignments')
      .select('id, title')
      .ilike('title', searchPattern)
      .limit(5);

    // Simplified filtering for students
    if (role === 'student') {
      // Just search published assignments - simpler and faster
      queryBuilder = queryBuilder.eq('status', 'published');
    }

    const { data: assignments, error } = await queryBuilder;

    if (!error && assignments) {
      assignments.forEach((assignment: any) => {
        results.push({
          type: 'assignment',
          id: assignment.id,
          title: assignment.title,
          description: 'Assignment',
          url: `/dashboard/assignments/${assignment.id}`,
          relevance: 100,
        });
      });
    }
  } catch (error) {
    console.error('Error searching assignments:', error);
  }

  return results;
}

// Search teachers - optimized for speed
async function searchTeachers(supabase: any, query: string, userId: string, role: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchPattern = `%${query}%`;
    
    // All roles can search for teachers
    const { data: teachers, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'teacher')
      .ilike('full_name', searchPattern)
      .limit(5)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error searching teachers:', error);
      return results;
    }

    if (teachers && teachers.length > 0) {
      teachers.forEach((teacher: any) => {
        results.push({
          type: 'teacher',
          id: teacher.id,
          title: teacher.full_name,
          description: teacher.email,
          url: `/dashboard/teachers/${teacher.id}`,
          relevance: 100,
        });
      });
      console.log(`Found ${teachers.length} teachers matching "${query}"`);
    } else {
      console.log(`No teachers found matching "${query}"`);
    }
  } catch (error) {
    console.error('Error searching teachers:', error);
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

    if (searchType === 'all' || searchType === 'teachers') {
      searchPromises.push(searchTeachers(userClient, enhancedQuery, user.user.id, profile?.role || 'student'));
    }

    // Wait for all searches to complete - optimized with individual timeouts
    const searchResults = await Promise.allSettled(
      searchPromises.map(p => 
        Promise.race([
          p,
          new Promise<SearchResult[]>((resolve) => {
            setTimeout(() => resolve([]), 1500); // 1.5 second timeout per search type
          })
        ])
      )
    );
    
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const results = result.value || [];
        console.log(`Search type ${index} returned ${results.length} results`);
        allResults.push(...results);
      } else {
        console.error(`Search type ${index} failed:`, result.reason);
      }
    });

    // Sort by relevance
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Limit results - reduced for faster display
    const limitedResults = allResults.slice(0, 10);

    // Log for debugging
    console.log(`Search query: "${query}" -> "${enhancedQuery}"`);
    console.log(`Total results before limit: ${allResults.length}, after limit: ${limitedResults.length}`);
    console.log('Search results breakdown:', {
      students: allResults.filter(r => r.type === 'student').length,
      teachers: allResults.filter(r => r.type === 'teacher').length,
      classes: allResults.filter(r => r.type === 'class').length,
      subjects: allResults.filter(r => r.type === 'subject').length,
      assignments: allResults.filter(r => r.type === 'assignment').length,
    });
    console.log('Limited results:', limitedResults.map(r => ({ type: r.type, title: r.title })));

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

