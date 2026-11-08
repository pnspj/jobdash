'use client';

import type { Todo } from '@jobdash/shared';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { secondaryButton } from '@/components/ui/styles';
import { useTodos } from '../api';
import { TodoForm } from './TodoDialog';
import TodoList from './TodoList';

type View = { mode: 'list' } | { mode: 'edit'; todo?: Todo };

/**
 * Dashboard to-dos (no agent): the only place where completed ones are shown.
 * Adding and editing happen inside the same dialog (no stacked modals).
 */
export default function TodoListDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: all = [] } = useTodos();
  const todos = all.filter((t) => !t.agentId);
  const [view, setView] = useState<View>({ mode: 'list' });
  const backToList = () => setView({ mode: 'list' });
  const close = () => {
    backToList();
    onClose();
  };

  const title = view.mode === 'list' ? 'ToDo一覧' : view.todo ? 'ToDoを編集' : 'ToDoを追加';

  return (
    <Modal open={open} title={title} onClose={close}>
      {view.mode === 'list' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setView({ mode: 'edit' })} className={secondaryButton}>
              ＋ ToDoを追加
            </button>
          </div>
          <TodoList
            todos={todos}
            onEdit={(todo) => setView({ mode: 'edit', todo })}
            showDone
            defaultDoneOpen
            emptyMessage="未完了のToDoはありません。"
          />
        </div>
      ) : (
        <TodoForm key={view.todo?.id ?? 'new'} todo={view.todo} onDone={backToList} onCancel={backToList} />
      )}
    </Modal>
  );
}
