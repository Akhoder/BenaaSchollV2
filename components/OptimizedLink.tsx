'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  asButton?: boolean;
  [key: string]: any;
}

/**
 * Optimized Link component that:
 * 1. Uses Next.js Link for prefetching
 * 2. Shows loading state during navigation
 * 3. Uses startTransition for smooth transitions
 */
export function OptimizedLink({
  href,
  children,
  className,
  prefetch = true,
  onClick,
  disabled = false,
  asButton = false,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick();
    }

    // Show loading state for programmatic navigation
    if (props.onClick || asButton) {
      setIsNavigating(true);
      startTransition(() => {
        router.push(href);
        // Reset loading state after a short delay
        setTimeout(() => setIsNavigating(false), 300);
      });
    }
  };

  // If it's a button-style link, use button with Link
  if (asButton) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center justify-center',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        {isNavigating && (
          <Loader2 className="absolute h-4 w-4 animate-spin" />
        )}
        <span className={cn(isNavigating && 'opacity-0')}>{children}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      className={cn(
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}



