'use client';

import { useEffect } from 'react';

/**
 * Suppresses known browser extension errors from console
 * These errors are harmless and come from browser extensions trying to inject scripts
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress known browser extension errors
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = function (...args: any[]) {
      const message = args[0]?.toString() || '';
      // Filter out common browser extension errors
      if (
        message.includes('content-youtube-embed.js') ||
        message.includes('browser extension') ||
        message.includes('This script should only be loaded in a browser extension') ||
        message.includes('Extension context invalidated')
      ) {
        return; // Suppress these errors
      }
      originalError.apply(console, args);
    };

    console.warn = function (...args: any[]) {
      const message = args[0]?.toString() || '';
      // Filter out common browser extension warnings
      if (
        message.includes('content-youtube-embed.js') ||
        message.includes('browser extension') ||
        message.includes('Extension context invalidated')
      ) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}

