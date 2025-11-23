import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper endpoint to list available Gemini models
export async function GET(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY not configured' 
      }, { status: 400 });
    }

    // Try to list models from both API versions
    const versions = ['v1', 'v1beta'];
    const results: any = {};

    for (const version of versions) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[version] = data.models || [];
        } else {
          const error = await response.text();
          results[version] = { error };
        }
      } catch (err: any) {
        results[version] = { error: err.message };
      }
    }

    return NextResponse.json({
      success: true,
      models: results,
      note: 'Check which models are available and use them in the chat API',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list models' },
      { status: 500 }
    );
  }
}

