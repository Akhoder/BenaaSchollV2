'use client';

import { AlertCircle, X, RefreshCw, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Enhanced Error Display Components
 * Phase 1 UX Improvement: Feedback and Status
 * Provides clear, actionable error messages
 */

interface ErrorDisplayProps {
  error: string | Error | null;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({ 
  error, 
  title, 
  onRetry, 
  onDismiss,
  className,
  variant = 'error'
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;
  
  const variantStyles = {
    error: {
      bg: 'bg-error-light border-error',
      text: 'text-error',
      icon: AlertCircle,
      defaultTitle: 'حدث خطأ'
    },
    warning: {
      bg: 'bg-warning-light border-warning',
      text: 'text-warning',
      icon: AlertTriangle,
      defaultTitle: 'تحذير'
    },
    info: {
      bg: 'bg-info-light border-info',
      text: 'text-info',
      icon: Info,
      defaultTitle: 'معلومة'
    }
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <Alert className={cn(
      'animate-fade-in border-2',
      style.bg,
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', style.text)} />
        <div className="flex-1">
          <AlertTitle className={cn('font-semibold mb-1', style.text)}>
            {title || style.defaultTitle}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage}
          </AlertDescription>
          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  إعادة المحاولة
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  إغلاق
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

interface SuccessMessageProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({ 
  message, 
  title = 'نجح',
  onDismiss,
  className 
}: SuccessMessageProps) {
  return (
    <Alert className={cn(
      'animate-fade-in border-2 bg-success-light border-success',
      className
    )}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 mt-0.5 text-success" />
        <div className="flex-1">
          <AlertTitle className="font-semibold mb-1 text-success">
            {title}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 mt-3"
            >
              <X className="h-3 w-3 mr-1" />
              إغلاق
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

// Inline error message for forms
interface InlineErrorProps {
  error?: string;
  className?: string;
}

export function InlineError({ error, className }: InlineErrorProps) {
  if (!error) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm text-error animate-fade-in mt-1',
      className
    )}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

// Empty state with error option
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  error?: string | Error | null;
  onRetry?: () => void;
}

export function EmptyState({ 
  title, 
  description, 
  icon: Icon, 
  action,
  error,
  onRetry
}: EmptyStateProps) {
  if (error) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <ErrorDisplay 
          error={error} 
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="text-center py-12 animate-fade-in">
      {Icon && (
        <div className="relative inline-block mb-4">
          <Icon className="h-20 w-20 mx-auto opacity-50 animate-float" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

