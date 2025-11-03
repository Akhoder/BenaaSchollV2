/**
 * Common table utility functions
 * Reduces duplicate code for table operations
 */

import { UserRole } from './supabase';

/**
 * Get badge color for role
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
    case 'teacher':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    case 'student':
      return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
    case 'supervisor':
      return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
    default:
      return 'bg-slate-200 dark:bg-slate-700';
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '-';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return '-';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

/**
 * Filter items by search query
 */
export function filterBySearch<T>(
  items: T[],
  searchQuery: string,
  searchFields: (item: T) => string[]
): T[] {
  if (!searchQuery.trim()) return items;
  
  const query = searchQuery.toLowerCase();
  return items.filter(item => {
    const fields = searchFields(item);
    return fields.some(field => field.toLowerCase().includes(query));
  });
}

/**
 * Filter items by role
 */
export function filterByRole<T extends { role: UserRole }>(
  items: T[],
  roleFilter: UserRole | 'all'
): T[] {
  if (roleFilter === 'all') return items;
  return items.filter(item => item.role === roleFilter);
}
