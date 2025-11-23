/**
 * Script to add 3 teachers to the database
 * 
 * Usage:
 * 1. Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local
 * 2. Run: npx tsx scripts/add-teachers.ts
 * 
 * Or run directly with Node.js:
 * node -r ts-node/register scripts/add-teachers.ts
 */

import { createClient, type User } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Teacher data
const teachers = [
  {
    email: 'teacher1@benaaschool.com',
    password: 'Teacher123!',
    full_name: 'أحمد محمد',
    phone: '+961 3 123 456',
    language_preference: 'ar'
  },
  {
    email: 'teacher2@benaaschool.com',
    password: 'Teacher123!',
    full_name: 'فاطمة علي',
    phone: '+961 3 234 567',
    language_preference: 'ar'
  },
  {
    email: 'teacher3@benaaschool.com',
    password: 'Teacher123!',
    full_name: 'محمد خالد',
    phone: '+961 3 345 678',
    language_preference: 'ar'
  }
];

async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error(`❌ Error listing users: ${error.message}`);
    return null;
  }
  const target = email.toLowerCase();
  return data.users.find((user) => user.email?.toLowerCase() === target) ?? null;
}

async function addTeachers() {
  console.log('🚀 Starting to add teachers...\n');

  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    console.log(`📝 Adding teacher ${i + 1}/3: ${teacher.full_name} (${teacher.email})`);

    try {
      // Check if user already exists via admin list
      const existingUser = await findUserByEmail(teacher.email);
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${teacher.email}`);
        
        // Update profile to ensure role is teacher
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: 'teacher',
            full_name: teacher.full_name,
            phone: teacher.phone,
            language_preference: teacher.language_preference
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error(`❌ Error updating profile: ${updateError.message}`);
        } else {
          console.log(`✅ Profile updated successfully`);
        }
        continue;
      }

      // Create user in auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: teacher.email,
        password: teacher.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: teacher.full_name,
          role: 'teacher',
          preferred_language: teacher.language_preference
        }
      });

      if (authError) {
        console.error(`❌ Error creating user: ${authError.message}`);
        continue;
      }

      if (!authData.user) {
        console.error(`❌ No user data returned`);
        continue;
      }

      console.log(`✅ User created: ${authData.user.id}`);

      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with additional information
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'teacher',
          full_name: teacher.full_name,
          phone: teacher.phone,
          language_preference: teacher.language_preference
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error(`❌ Error updating profile: ${profileError.message}`);
        
        // If profile doesn't exist, create it manually
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: teacher.email,
            full_name: teacher.full_name,
            role: 'teacher',
            phone: teacher.phone,
            language_preference: teacher.language_preference
          });

        if (insertError) {
          console.error(`❌ Error creating profile: ${insertError.message}`);
        } else {
          console.log(`✅ Profile created successfully`);
        }
      } else {
        console.log(`✅ Profile updated successfully`);
      }

      console.log(`✅ Teacher ${i + 1} added successfully!\n`);

    } catch (error: any) {
      console.error(`❌ Unexpected error: ${error.message}\n`);
    }
  }

  console.log('✨ Done! All teachers have been processed.');
  console.log('\n📋 Summary:');
  console.log('Email: teacher1@benaaschool.com | Password: Teacher123!');
  console.log('Email: teacher2@benaaschool.com | Password: Teacher123!');
  console.log('Email: teacher3@benaaschool.com | Password: Teacher123!');
  console.log('\n⚠️  Please change passwords after first login!');
}

// Run the script
addTeachers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


