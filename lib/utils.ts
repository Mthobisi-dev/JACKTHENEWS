import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format ISO or standard date strings into concise relative time descriptions
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'Recently';

  // L6: If a raw number is provided and it looks like Unix seconds (< 10^10),
  // convert to milliseconds so "1970" dates don't appear.
  let normalised: string | number | Date = dateInput;
  if (typeof dateInput === 'number' && dateInput < 1e10) {
    console.warn('[formatRelativeTime] Received value looks like Unix seconds; multiplying by 1000. Pass milliseconds to suppress this warning.');
    normalised = dateInput * 1000;
  }

  const date = new Date(normalised);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Future dates or negative diffs
  if (diffMs < 0) return 'Just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // L7: Use the browser's locale instead of hardcoded en-US so international users
  // see their expected date format.
  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : undefined;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

/**
 * Format numbers into concise human-readable labels (e.g. 1.2k, 3.4M)
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Basic HTML escaping to prevent XSS in text rendering
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize untrusted input strings
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 10000);
}
