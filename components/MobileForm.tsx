'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { InlineError } from '@/components/ErrorDisplay';

/**
 * Mobile-Optimized Form Components
 * Phase 2 UX Improvement: Mobile-First and Responsive Design
 * Ensures forms are touch-friendly and readable on mobile
 */

interface MobileFormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileFormField({
  label,
  error,
  required,
  hint,
  children,
  className
}: MobileFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-base font-medium">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </Label>
      {hint && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      <div className="min-h-[48px]">
        {children}
      </div>
      <InlineError error={error} />
    </div>
  );
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function MobileInput({
  label,
  error,
  hint,
  className,
  ...props
}: MobileInputProps) {
  return (
    <MobileFormField label={label} error={error} hint={hint} required={props.required}>
      <Input
        {...props}
        className={cn(
          'min-h-[48px] text-base', // Larger touch target and text
          error && 'border-error focus:border-error focus:ring-error/20',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
    </MobileFormField>
  );
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function MobileTextarea({
  label,
  error,
  hint,
  className,
  ...props
}: MobileTextareaProps) {
  return (
    <MobileFormField label={label} error={error} hint={hint} required={props.required}>
      <Textarea
        {...props}
        className={cn(
          'min-h-[120px] text-base resize-y', // Larger for mobile
          error && 'border-error focus:border-error focus:ring-error/20',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
    </MobileFormField>
  );
}

interface MobileSelectProps {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function MobileSelect({
  label,
  value,
  onValueChange,
  options,
  error,
  hint,
  required,
  placeholder,
  className
}: MobileSelectProps) {
  return (
    <MobileFormField label={label} error={error} hint={hint} required={required}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            'min-h-[48px] text-base',
            error && 'border-error focus:border-error focus:ring-error/20',
            className
          )}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="min-h-[48px] text-base"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </MobileFormField>
  );
}

