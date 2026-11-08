'use client';

import { useState } from 'react';
import { secondaryButton } from './styles';

/** Copies `text` to the clipboard and briefly shows a confirmation. */
export default function CopyButton({ text, label = 'コピー', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1500);
  };

  return (
    <button type="button" onClick={copy} disabled={disabled || text === ''} className={secondaryButton}>
      {state === 'copied' ? 'コピーしました' : state === 'failed' ? 'コピーできませんでした' : label}
    </button>
  );
}
