import type { ReactNode } from 'react';

interface Props {
  href?: string;
  children?: ReactNode;
  /** Show the ↗ marker after the label. */
  marker?: boolean;
  className?: string;
  /** Stop click propagation, e.g. inside a clickable table row. */
  stopPropagation?: boolean;
}

/** Link opened in a new tab. Renders only the children (or "-") when href is empty. */
export default function ExternalLink({ href, children, marker = false, className = '', stopPropagation }: Props) {
  if (!href) return <>{children ?? '-'}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={`text-blue-700 hover:underline ${className}`}
    >
      {children ?? href}
      {marker && (
        <span className="ml-0.5 text-xs text-slate-400" aria-hidden>
          ↗
        </span>
      )}
    </a>
  );
}
