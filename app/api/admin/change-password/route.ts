import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
// Note: force-static for GitHub Pages static export compatibility
// This API route will not work on GitHub Pages (requires server-side rendering)
// For production, deploy to Vercel, Netlify, or another platform that supports API routes
export const dynamic = 'force-static';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !anon) {
      return NextResponse.json({ error: 'Supabase URL/Anon key missing' }, { status: 500 });
    }
    if (!service) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY on server' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin using the caller's access token
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: me, error: meErr } = await userClient.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role from profiles (RLS allows user to read self)
    const { data: prof, error: profErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', me.user.id)
      .maybeSingle();
    if (profErr || !prof || prof.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update target user's password with service role
    const adminClient = createClient(supabaseUrl, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message || 'Update failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


