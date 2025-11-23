'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Responsive Table Component
 * Phase 2 UX Improvement: Mobile-First and Responsive Design
 * Converts table to card layout on mobile devices
 */

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  title?: string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  title,
  emptyMessage = 'No data available',
  className,
  onRowClick
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleColumns = columns.filter(col => !col.hideOnMobile);

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'border-b hover:bg-muted/50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    {column.render
                      ? column.render(item)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={cn(
              'transition-all hover:shadow-md',
              onRowClick && 'cursor-pointer'
            )}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4 space-y-3">
              {visibleColumns.map((column) => (
                <div key={column.key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {column.mobileLabel || column.header}
                  </span>
                  <span className="text-sm">
                    {column.render
                      ? column.render(item)
                      : item[column.key]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

