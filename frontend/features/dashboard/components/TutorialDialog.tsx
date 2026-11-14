'use client';

import { STARTER_TODOS, type TodoInput } from '@jobdash/shared';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { primaryButton, secondaryButton } from '@/components/ui/styles';
import { useRestoreBackup } from '@/features/backup/api';
import { useTodoMutations } from '@/features/todos/api';
import { errorMessage } from '@/lib/apiClient';

interface Props {
  open: boolean;
  /** Close without doing anything ("キャンセル"); the caller remembers the dismissal. */
  onDismiss: () => void;
  onDone: () => void;
}

/** First-run guide shown when there are no companies, agents or to-dos. */
export default function TutorialDialog({ open, onDismiss, onDone }: Props) {
  const { createMany } = useTodoMutations();
  const restore = useRestoreBackup();
  const [error, setError] = useState<string | null>(null);
  const busy = createMany.isPending || restore.isPending;

  const start = async (todo: TodoInput) => {
    setError(null);
    try {
      await createMany.mutateAsync([todo]);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'ToDoの登録に失敗しました'));
    }
  };
  const isStarting = (todo: TodoInput) => createMany.isPending && createMany.variables?.[0] === todo;

  const loadSample = async () => {
    setError(null);
    try {
      // Loaded on demand so the sample JSON is not part of the dashboard bundle
      const { sampleBackup } = await import('@jobdash/shared/sample');
      await restore.mutateAsync(sampleBackup());
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'サンプルデータの読み込みに失敗しました'));
    }
  };

  return (
    <Modal open={open} title="転職活動を始めましょう" onClose={onDismiss}>
      <div className="space-y-5">
        <StartOption
          title="さっそく始める"
          message="まずはエージェントに登録して、最初の一歩を踏み出しましょう。"
          todo={STARTER_TODOS.start}
          primary
          busy={busy}
          pending={isStarting(STARTER_TODOS.start)}
          onStart={start}
        />
        <StartOption
          title="まだ考え中"
          message="現在の業務から、自分の経歴を振り返ってみましょう。"
          todo={STARTER_TODOS.consider}
          busy={busy}
          pending={isStarting(STARTER_TODOS.consider)}
          onStart={start}
        />

        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">サンプルを見る</h3>
          <p className="mt-1 text-sm text-slate-700">サンプルの転職活動の様子を見て、イメージをしてみましょう。</p>
          <button type="button" onClick={loadSample} disabled={busy} className={`${secondaryButton} mt-3`}>
            {restore.isPending ? '読み込み中...' : 'サンプルデータを読み込む'}
          </button>
        </section>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end">
          <button type="button" onClick={onDismiss} disabled={busy} className="text-sm text-slate-500 hover:underline">
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** A tutorial choice that registers one starter to-do. */
function StartOption({
  title,
  message,
  todo,
  primary = false,
  busy,
  pending,
  onStart,
}: {
  title: string;
  message: string;
  todo: TodoInput;
  primary?: boolean;
  busy: boolean;
  pending: boolean;
  onStart: (todo: TodoInput) => void;
}) {
  return (
    <section className={`rounded-lg border p-4 ${primary ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
      <h3 className={`font-semibold ${primary ? 'text-blue-900' : 'text-slate-900'}`}>{title}</h3>
      <p className="mt-1 text-sm text-slate-700">{message}</p>
      <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
        <li>{todo.title}</li>
      </ul>
      <button
        type="button"
        onClick={() => onStart(todo)}
        disabled={busy}
        className={`${primary ? primaryButton : secondaryButton} mt-3`}
      >
        {pending ? '登録中...' : 'このToDoで始める'}
      </button>
    </section>
  );
}
