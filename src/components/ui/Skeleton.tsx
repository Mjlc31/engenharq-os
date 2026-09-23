import React from 'react';
import { cn } from '../../lib/utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800", className)}
      {...props}
    />
  );
}

// Skeleton helpers for common layouts
export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border p-4 rounded-xl flex flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-end justify-between mt-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col p-4 h-full min-h-[300px]">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 flex items-center justify-center">
         <Skeleton className="w-40 h-40 rounded-full" />
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-4 flex justify-between items-center border-b border-border/50">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-10" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}
