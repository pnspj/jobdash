'use client';

import { type ComponentProps, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type Props = Omit<ComponentProps<'textarea'>, 'value' | 'ref'> & { value: string };

/** Textarea that grows with its content so everything stays visible (`rows` is the minimum height). */
export default function AutoTextarea({ className = '', ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight excludes the border; add it back so the last line is not cut off
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refit whenever the text changes
  useLayoutEffect(fit, [fit, props.value]);

  // Line wrapping changes with the width
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  return <textarea ref={ref} {...props} className={`resize-none overflow-hidden ${className}`} />;
}
