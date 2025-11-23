'use client';

import { Input } from '@/components/ui/input';
import { InputHTMLAttributes, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Input Mask Component
 * Phase 3 UX Improvement: Forms and Input
 * Provides input masking for phone numbers, dates, IDs, etc.
 */

interface InputMaskProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: 'phone' | 'date' | 'id' | 'currency' | 'custom';
  customMask?: (value: string) => string;
  onChange?: (value: string) => void;
  value?: string;
}

const masks = {
  phone: (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format: +XXX-XXX-XXXX or (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  },
  
  date: (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  },
  
  id: (value: string): string => {
    // Remove all non-alphanumeric
    const alphanumeric = value.replace(/[^A-Za-z0-9]/g, '');
    // Format: XXX-XXX-XXX
    if (alphanumeric.length <= 3) return alphanumeric;
    if (alphanumeric.length <= 6) return `${alphanumeric.slice(0, 3)}-${alphanumeric.slice(3)}`;
    return `${alphanumeric.slice(0, 3)}-${alphanumeric.slice(3, 6)}-${alphanumeric.slice(6, 9)}`;
  },
  
  currency: (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    // Format: XXX.XX
    const amount = parseInt(digits, 10) / 100;
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};

export function InputMask({
  mask,
  customMask,
  onChange,
  value = '',
  className,
  ...props
}: InputMaskProps) {
  const [displayValue, setDisplayValue] = useState(value);

  const applyMask = useCallback((inputValue: string): string => {
    if (mask === 'custom' && customMask) {
      return customMask(inputValue);
    }
    if (mask !== 'custom') {
      return masks[mask](inputValue);
    }
    return inputValue;
  }, [mask, customMask]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const maskedValue = applyMask(inputValue);
    setDisplayValue(maskedValue);
    onChange?.(maskedValue);
  };

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      className={className}
    />
  );
}

