'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * AutoComplete Input Component
 * Phase 3 UX Improvement: Forms and Input
 * Provides autocomplete functionality with suggestions
 */

interface AutoCompleteOption {
  value: string;
  label: string;
  description?: string;
}

interface AutoCompleteInputProps {
  options: AutoCompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: AutoCompleteOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxSuggestions?: number;
  filterFn?: (option: AutoCompleteOption, search: string) => boolean;
}

export function AutoCompleteInput({
  options,
  value = '',
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  allowCustom = true,
  maxSuggestions = 10,
  filterFn
}: AutoCompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const defaultFilter = (option: AutoCompleteOption, searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return (
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term) ||
      option.description?.toLowerCase().includes(term)
    );
  };

  const filter = filterFn || defaultFilter;
  const filteredOptions = options
    .filter(option => filter(option, search))
    .slice(0, maxSuggestions);

  const handleSelect = (option: AutoCompleteOption) => {
    setSearch(option.label);
    setOpen(false);
    onChange?.(option.value);
    onSelect?.(option);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange?.(newValue);
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={search}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
            autoComplete="off"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setOpen(!open)}
            disabled={disabled}
            aria-label="Toggle suggestions"
          >
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>
                {allowCustom ? 'No suggestions. Type to create custom value.' : 'No results found.'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        search === option.label ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

