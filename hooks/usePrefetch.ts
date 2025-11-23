'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ✅ PERFORMANCE: Strategic Prefetching Hook
 * Prefetches important pages when user is likely to navigate to them
 */
export function usePrefetch(pages: string[]) {
  const router = useRouter();

  useEffect(() => {
    // Prefetch pages after a short delay to not block initial load
    const timer = setTimeout(() => {
      pages.forEach((page) => {
        router.prefetch(page);
      });
    }, 2000); // Wait 2 seconds after page load

    return () => clearTimeout(timer);
  }, [router, pages]);
}

/**
 * Prefetch on hover for better UX
 */
export function usePrefetchOnHover(href: string) {
  const router = useRouter();

  const handleMouseEnter = () => {
    router.prefetch(href);
  };

  return { onMouseEnter: handleMouseEnter };
}


