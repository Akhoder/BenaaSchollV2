'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const [startPoint, setStartPoint] = useState<number | null>(null);
  const [pullChange, setPullChange] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Threshold to trigger refresh (pixels)
  const pullThreshold = 80;
  // Max pull distance visual
  const maxPull = 120;

  const initTouch = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return;
    
    // Only enable if we are at the top of the page/container
    if (window.scrollY > 0 && (!containerRef.current || containerRef.current.scrollTop > 0)) return;
    
    setStartPoint(e.touches[0].clientY);
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!startPoint || disabled || refreshing) return;
    
    const y = e.touches[0].clientY;
    const diff = y - startPoint;
    
    // Only allow pulling down
    if (diff > 0) {
      // Add resistance
      const pull = Math.min(diff * 0.5, maxPull);
      setPullChange(pull);
      
      // Prevent default only if we are pulling
      if (e.cancelable && pull > 0 && window.scrollY <= 0) {
        e.preventDefault();
      }
    }
  }, [startPoint, disabled, refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!startPoint || disabled || refreshing) return;
    
    if (pullChange >= pullThreshold) {
      setRefreshing(true);
      setPullChange(60); // Keep loading spinner visible
      
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          setPullChange(0);
        }, 500); // Minimum visual delay
      }
    } else {
      setPullChange(0);
    }
    
    setStartPoint(null);
  }, [startPoint, pullChange, disabled, refreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // We attach to window for better touch handling if the container is the main scroller
    // or attach to container if it has its own scroll. 
    // For this generic implementation, let's assume the window or the direct parent handles scroll.
    // However, to prevent scroll chaining, we often need to attach non-passive listeners.
    
    window.addEventListener('touchstart', initTouch, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', initTouch);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [initTouch, onTouchMove, onTouchEnd]);

  return (
    <div ref={containerRef} className={cn("relative min-h-full", className)}>
      {/* Refresh Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-50 overflow-hidden"
        style={{ 
          height: `${pullChange}px`,
          opacity: Math.min(pullChange / 40, 1),
          transition: refreshing ? 'height 0.3s ease' : 'height 0.1s ease-out'
        }}
      >
        <div className="flex items-end pb-2">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full bg-background shadow-md border border-border text-primary transition-transform duration-300",
            refreshing && "animate-spin"
          )}>
            {refreshing ? (
              <Loader2 className="w-5 h-5" />
            ) : (
              <ArrowDown 
                className="w-5 h-5" 
                style={{ transform: `rotate(${Math.min(pullChange / pullThreshold * 180, 180)}deg)` }} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${pullChange}px)`,
          transition: refreshing ? 'transform 0.3s ease' : 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}

