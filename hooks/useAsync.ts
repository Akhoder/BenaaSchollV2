import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseAsyncReturn<T> {
  data: T | null;
  error: any;
  loading: boolean;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Custom hook for handling async operations
 * Provides loading, error, and data states with automatic cleanup
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncReturn<T> {
  const { immediate = false, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          if (onSuccess) {
            onSuccess(result);
          }
        }
        
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
          if (onError) {
            onError(err);
          }
        }
        return undefined;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []); // Only run once on mount

  return { data, error, loading, execute, reset };
}
