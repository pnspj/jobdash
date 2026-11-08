'use client';

import { useSearchParams } from 'next/navigation';

/**
 * "Return to" navigation: pages that link to a company detail pass their own URL in `?from=`,
 * so the detail page (and pages reached from it) can link back there instead of the company list.
 */

/** Accept only same-origin absolute paths (prevents open redirects such as "//evil.example"). */
export function sanitizeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
}

/** Label for a back link to `path`. */
export function returnLabel(path: string | undefined): string {
  if (path?.startsWith('/calendar')) return 'カレンダー';
  if (path?.startsWith('/agents')) return 'エージェント';
  return '企業一覧';
}

/** Append `from=<returnTo>` to `href` when a return target is given. */
export function withReturnTo(href: string, returnTo: string | undefined): string {
  if (!returnTo) return href;
  return `${href}${href.includes('?') ? '&' : '?'}from=${encodeURIComponent(returnTo)}`;
}

/** The sanitized `from` query parameter of the current page. Requires a Suspense boundary. */
export function useReturnTo(): string | undefined {
  return sanitizeReturnTo(useSearchParams().get('from'));
}
