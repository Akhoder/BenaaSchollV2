import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles with new design system
      'rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl text-card-foreground',
      // Enhanced shadows
      'shadow-lg shadow-primary/5 dark:shadow-primary/10',
      // Smooth transitions
      'transition-all duration-300',
      // Hover effects with golden accent
      'hover:shadow-xl hover:shadow-primary/10 hover:border-secondary/30',
      // Optional: subtle scale on hover
      'hover:-translate-y-0.5',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

// ✨ New: Card variant with golden border
const CardGolden = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative rounded-2xl bg-card/95 backdrop-blur-xl text-card-foreground overflow-hidden group',
      'shadow-lg transition-all duration-300',
      'hover:shadow-xl hover:-translate-y-1',
      className
    )}
    {...props}
  >
    {/* Golden border gradient */}
    <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-secondary/40 via-primary/30 to-secondary/40 opacity-60 group-hover:opacity-100 transition-opacity" style={{ 
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      padding: '2px'
    }} />
    {/* Content */}
    <div className="relative z-10">
      {props.children}
    </div>
  </div>
));
CardGolden.displayName = 'CardGolden';

// ✨ New: Glass Card variant
const CardGlass = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'glass-card-hover',
      className
    )}
    {...props}
  />
));
CardGlass.displayName = 'CardGlass';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-tight tracking-tight',
      'text-foreground font-display',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardGolden,
  CardGlass,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
