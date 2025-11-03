import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/supabase';

interface UseAuthCheckOptions {
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
  allowLoading?: boolean;
}

/**
 * Custom hook for authentication and authorization checks
 * Reduces duplicate auth checking code across pages
 */
export function useAuthCheck(options: UseAuthCheckOptions = {}) {
  const { requiredRole, redirectTo = '/login', allowLoading = true } = options;
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Allow loading state
    if (allowLoading && authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!profile) {
      router.push(redirectTo);
      return;
    }

    // Check role if required
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(profile.role)) {
        router.push('/dashboard');
        return;
      }
    }
  }, [profile, authLoading, requiredRole, redirectTo, router, allowLoading]);

  return {
    profile,
    loading: authLoading,
    isAuthorized: profile && (!requiredRole || (Array.isArray(requiredRole) ? requiredRole.includes(profile.role) : profile.role === requiredRole)),
  };
}
