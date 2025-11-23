'use client';

import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Progress Indicator Components
 * Phase 1 UX Improvement: Speed and Performance
 * Provides visual feedback for loading and progress states
 */

interface ProgressIndicatorProps {
  value?: number; // 0-100
  showPercentage?: boolean;
  label?: string;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function ProgressIndicator({
  value,
  showPercentage = false,
  label,
  className,
  variant = 'default'
}: ProgressIndicatorProps) {
  const variantStyles = {
    default: 'bg-primary',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  return (
    <div className={cn('space-y-2 animate-fade-in', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && value !== undefined && (
            <span className="font-semibold text-foreground">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <Progress 
        value={value} 
        className={cn('h-2', variantStyles[variant])}
      />
    </div>
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ loading, children, className, disabled, ...props }: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <Loader2 className="absolute h-4 w-4 animate-spin" />
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export function StepProgress({ 
  currentStep, 
  totalSteps, 
  labels,
  className 
}: StepProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn('space-y-4 animate-fade-in', className)}>
      <ProgressIndicator 
        value={percentage} 
        showPercentage 
        label={`خطوة ${currentStep} من ${totalSteps}`}
      />
      {labels && labels.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {labels.map((label, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-col items-center gap-1',
                index < currentStep && 'text-primary font-medium',
                index === currentStep - 1 && 'text-primary font-semibold'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index < currentStep
                    ? 'bg-primary'
                    : index === currentStep - 1
                    ? 'bg-primary ring-2 ring-primary/50'
                    : 'bg-muted'
                )}
              />
              <span className="text-center max-w-[80px] truncate">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CircularProgressProps {
  value?: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

export function CircularProgress({
  value,
  size = 'md',
  showPercentage = false,
  label,
  className
}: CircularProgressProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const strokeWidth = {
    sm: 3,
    md: 4,
    lg: 6,
  };

  const radius = {
    sm: 18,
    md: 24,
    lg: 36,
  };

  const circumference = 2 * Math.PI * radius[size];
  const offset = circumference - (value || 0) / 100 * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2 animate-fade-in', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <svg
          className="transform -rotate-90"
          width={sizeClasses[size].split(' ')[0].replace('w-', '')}
          height={sizeClasses[size].split(' ')[1].replace('h-', '')}
        >
          {/* Background circle */}
          <circle
            cx={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            cy={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            r={radius[size] - strokeWidth[size] / 2}
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            cy={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            r={radius[size] - strokeWidth[size] / 2}
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              'font-semibold text-primary',
              size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
            )}>
              {value ? Math.round(value) : 0}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

interface FileUploadProgressProps {
  fileName: string;
  progress: number;
  onCancel?: () => void;
  className?: string;
}

export function FileUploadProgress({
  fileName,
  progress,
  onCancel,
  className
}: FileUploadProgressProps) {
  return (
    <div className={cn('space-y-2 p-4 border rounded-lg bg-card animate-fade-in', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate flex-1">{fileName}</span>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground ml-2"
          >
            إلغاء
          </button>
        )}
      </div>
      <ProgressIndicator value={progress} showPercentage />
    </div>
  );
}

