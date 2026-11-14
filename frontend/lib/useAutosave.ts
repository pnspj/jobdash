'use client';

import { useEffect, useRef } from 'react';

/** Text is saved after this much idle time while typing (and right away on blur). */
export const AUTOSAVE_DELAY_MS = 2000;

interface Options {
  /** The draft differs from the saved data. */
  dirty: boolean;
  /** A save of this editor is in flight. */
  pending: boolean;
  /** Send every unsaved change (it is then queued after any save in flight). */
  send: () => void;
  /**
   * Values whose change restarts the idle timer: the draft and the saved version.
   * Compared by JSON, so pass plain data.
   */
  watch: unknown;
}

/**
 * Autosave for an editor with a local draft: after a pause in typing, on demand (`save`, e.g. on blur),
 * or right after the next render (`saveSoon`, e.g. for a star click). Leaving the screen through the app
 * saves what is left; closing the tab with unsaved changes asks for confirmation.
 */
export function useAutosave({ dirty, pending, send, watch }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const soon = useRef(false);

  const save = () => {
    clearTimeout(timer.current);
    if (!dirty) return;
    // One save at a time: the effect below runs again when the response changes the saved version
    if (pending) {
      soon.current = true;
      return;
    }
    send();
  };
  const latest = useRef({ save, send, dirty });
  latest.current = { save, send, dirty };

  const key = JSON.stringify(watch);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` covers every edit and every saved response
  useEffect(() => {
    if (!dirty) return;
    const delay = soon.current ? 0 : AUTOSAVE_DELAY_MS;
    soon.current = false;
    timer.current = setTimeout(() => latest.current.save(), delay);
    return () => clearTimeout(timer.current);
  }, [dirty, key]);

  useEffect(
    () => () => {
      if (latest.current.dirty) latest.current.send();
    },
    [],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return {
    save,
    /** Save right after the change being made now is rendered. */
    saveSoon: () => {
      soon.current = true;
    },
  };
}
