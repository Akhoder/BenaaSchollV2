'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: string, language: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      }

      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          // Profile doesn't exist yet, this is normal during signup
          return;
        }
      }

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  // ✅ PERFORMANCE: Use useCallback to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push('/dashboard');
    }

    return { error };
  }, [router]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: string, language: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            preferred_language: language,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        return { error };
      }

      // Wait a moment for the trigger to create the profile
      if (data.user) {
        // Try to fetch the profile after a short delay
        setTimeout(async () => {
          await fetchProfile(data.user!.id);
        }, 1000);
      }

      router.push('/login');
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      return { error: err };
    }
  }, [router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  }, [router]);

  // ✅ PERFORMANCE: Memoize context value to prevent re-renders
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, profile, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
