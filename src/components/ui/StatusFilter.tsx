import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusFilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface StatusFilterProps<T extends string> {
  label: string;
  options: StatusFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function StatusFilter<T extends string>({ label, options, value, onChange }: StatusFilterProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover'
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('tabular-nums', active ? 'text-primary' : 'text-foreground')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
