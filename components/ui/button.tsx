import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Primary - Main actions (uses design system primary color)
        default: 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white hover:from-[hsl(var(--primary-dark))] hover:to-[hsl(var(--accent-dark))] shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02]',
        
        // Destructive - Delete, remove actions
        destructive:
          'bg-gradient-to-r from-[hsl(var(--error))] to-[hsl(var(--error))] text-white hover:from-[hsl(var(--error))] hover:to-[hsl(var(--error))] shadow-lg shadow-error/30 hover:shadow-xl hover:shadow-error/40 hover:scale-[1.02]',
        
        // Outline - Secondary actions
        outline:
          'border-2 border-[hsl(var(--primary))] bg-transparent text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-light))] hover:border-[hsl(var(--primary-dark))] shadow-sm hover:shadow-md',
        
        // Secondary - Alternative actions
        secondary:
          'bg-gradient-to-r from-[hsl(var(--secondary))] to-[hsl(var(--secondary))] text-white hover:from-[hsl(var(--secondary))] hover:to-[hsl(var(--secondary))] shadow-md hover:shadow-lg hover:scale-[1.02]',
        
        // Ghost - Subtle actions
        ghost: 'hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
        
        // Link - Text links
        link: 'text-[hsl(var(--primary))] underline-offset-4 hover:underline hover:text-[hsl(var(--primary-dark))]',
        
        // Success - Positive actions
        success: 'bg-gradient-to-r from-[hsl(var(--success))] to-[hsl(var(--success))] text-white hover:from-[hsl(var(--success))] hover:to-[hsl(var(--success))] shadow-lg shadow-success/30 hover:shadow-xl hover:shadow-success/40 hover:scale-[1.02]',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-9 rounded-lg px-4 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
