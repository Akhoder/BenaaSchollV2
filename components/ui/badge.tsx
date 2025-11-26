import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary - Main badge (Emerald Green)
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        
        // Secondary - Golden accent
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm',
        
        // Destructive - Errors/Warnings
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        
        // Outline - Bordered badge
        outline: 
          'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/50',
        
        // ✨ New: Gold badge for special items
        gold:
          'border-secondary/50 bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary-foreground hover:from-secondary/30 hover:to-secondary/20 shadow-sm',
        
        // ✨ New: Success badge
        success:
          'border-transparent bg-success text-white hover:bg-success/90 shadow-sm',
        
        // ✨ New: Warning badge
        warning:
          'border-transparent bg-warning text-white hover:bg-warning/90 shadow-sm',
        
        // ✨ New: Info badge
        info:
          'border-transparent bg-info text-white hover:bg-info/90 shadow-sm',
        
        // ✨ New: Accent badge (Deep Indigo)
        accent:
          'border-transparent bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm',
        
        // ✨ New: Glass effect badge
        glass:
          'border-white/20 bg-white/10 backdrop-blur-sm text-foreground hover:bg-white/20',
        
        // ✨ New: Islamic styled badge
        islamic:
          'border-secondary/40 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 text-primary font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
