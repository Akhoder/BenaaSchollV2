import { useState, useEffect, useMemo } from 'react';

interface UsePaginationOptions {
  itemsPerPage?: number;
  resetOnChange?: boolean;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  totalPages: number;
  paginatedItems: T[];
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

/**
 * Custom hook for pagination functionality
 * Reduces duplicate pagination code across pages
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { itemsPerPage: initialItemsPerPage = 20, resetOnChange = true } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Reset to page 1 when items change (if resetOnChange is true)
  useEffect(() => {
    if (resetOnChange) {
      setCurrentPage(1);
    }
  }, [items.length, resetOnChange]);

  const totalPages = useMemo(() => Math.ceil(items.length / itemsPerPage), [items.length, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage]);
  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    totalItems: items.length,
  };
}
