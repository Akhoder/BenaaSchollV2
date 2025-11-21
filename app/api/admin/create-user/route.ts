import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: user, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single();

    // Only admins, teachers, and supervisors can create users
    if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
      full_name,
      role,
      language_preference = 'en',
      phone,
      gender,
      address,
      date_of_birth,
      specialization,
      years_of_experience,
      qualifications,
      bio,
      parent_name,
      parent_phone,
      emergency_contact,
      appointment_date,
      department,
    } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 });
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate a random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-12) + 'A1!';

    // Create user in auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
        preferred_language: language_preference,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
    }

    const userId = authData.user.id;

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with all fields
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name,
        email,
        role,
        language_preference,
        phone: phone || null,
        gender: gender || null,
        address: address || null,
        date_of_birth: date_of_birth || null,
        specialization: specialization || null,
        years_of_experience: years_of_experience || null,
        qualifications: qualifications || null,
        bio: bio || null,
        parent_name: parent_name || null,
        parent_phone: parent_phone || null,
        emergency_contact: emergency_contact || null,
        appointment_date: appointment_date || null,
        department: department || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Try to delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name,
        role,
        password: password ? undefined : userPassword, // Only return if auto-generated
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

