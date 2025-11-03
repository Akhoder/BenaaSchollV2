/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Extracts user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extracts error code from Supabase or other errors
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('code' in error) {
      return String(error.code);
    }
    if ('error' in error && typeof error.error === 'object' && error.error && 'code' in error.error) {
      return String(error.error.code);
    }
  }
  return undefined;
}

/**
 * Checks if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'PGRST301' || code === 'ECONNREFUSED' || 
         (error instanceof Error && error.message.includes('network'));
}

/**
 * Checks if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'PGRST301' || code === '401' || 
         (error instanceof Error && error.message.toLowerCase().includes('unauthorized'));
}

/**
 * Checks if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'PGRST116' || code === '404' ||
         (error instanceof Error && error.message.toLowerCase().includes('not found'));
}

/**
 * Creates a standardized error object
 */
export function createError(message: string, code?: string, status?: number): AppError {
  return { message, code, status };
}
