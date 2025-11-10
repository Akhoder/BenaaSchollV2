'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keyboard Navigation Hook
 * Phase 2 UX Improvement: Accessibility
 * Provides keyboard shortcuts for common actions
 */

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for the application
 */
export const commonShortcuts = {
  dashboard: { key: 'd', ctrl: true, description: 'Go to Dashboard' },
  search: { key: 'k', ctrl: true, description: 'Open Search' },
  new: { key: 'n', ctrl: true, description: 'Create New' },
  save: { key: 's', ctrl: true, description: 'Save' },
  close: { key: 'Escape', description: 'Close Modal/Dialog' },
  back: { key: 'b', ctrl: true, description: 'Go Back' },
};

/**
 * Skip Link Component for Keyboard Navigation
 */
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg"
      aria-label="Skip to main content"
    >
      {children}
    </a>
  );
}

