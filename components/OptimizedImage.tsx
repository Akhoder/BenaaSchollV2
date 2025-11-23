'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Optimized Image Component
 * Phase 3 UX Improvement: Speed and Performance
 * Wrapper around Next.js Image with fallback and loading states
 */

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
  sizes,
  objectFit = 'cover',
  placeholder = 'empty',
  blurDataURL,
  onError
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted',
        className
      )}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const imageProps = fill
    ? {
        fill: true,
        sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        className: cn('object-cover', className),
      }
    : {
        width: width || 400,
        height: height || 300,
        className: cn('object-cover', className),
      };

  return (
    <div className={cn('relative overflow-hidden', !fill && className)}>
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        {...imageProps}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
          onError?.();
        }}
        loading={priority ? undefined : 'lazy'}
      />
    </div>
  );
}

