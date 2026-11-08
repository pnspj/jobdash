'use client';

import { dashboardRows, isEmptyWorkspace, type Todo } from '@jobdash/shared';
import { useMemo, useState } from 'react';
import { PAGE_ICONS } from '@/components/layout/nav';
import PageTitle from '@/components/layout/PageTitle';
import { errorBox, primaryButton, secondaryButton } from '@/components/ui/styles';
import { useAgents } from '@/features/agents/api';
import { useCompanies } from '@/features/companies/api';
import DashboardTable from '@/features/dashboard/components/DashboardTable';
import TutorialDialog from '@/features/dashboard/components/TutorialDialog';
import { useTodos } from '@/features/todos/api';
import TodoDialog from '@/features/todos/components/TodoDialog';
import TodoListDialog from '@/features/todos/components/TodoListDialog';
import { errorMessage } from '@/lib/apiClient';
import { usePersistentState } from '@/lib/usePersistentState';

/** Top page: only what needs doing now, in one table ordered by next action. */
export default function DashboardPage() {
  const companies = useCompanies();
  const agents = useAgents();
  const todos = useTodos();
  const [tutorial, setTutorial, tutorialLoaded] = usePersistentState('jobdash.tutorial', { dismissed: false });
  // undefined = closed, null = adding, Todo = editing
  const [dialogTodo, setDialogTodo] = useState<Todo | null | undefined>(undefined);
  const [listOpen, setListOpen] = useState(false);

  const loaded = companies.isSuccess && agents.isSuccess && todos.isSuccess;
  const rows = useMemo(() => dashboardRows(companies.data ?? [], todos.data ?? []), [companies.data, todos.data]);
  const showTutorial =
    loaded &&
    tutorialLoaded &&
    !tutorial.dismissed &&
    isEmptyWorkspace({ companies: companies.data.length, agents: agents.data.length, todos: todos.data.length });
  const error = companies.error ?? agents.error ?? todos.error;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={PAGE_ICONS.dashboard}>ダッシュボード</PageTitle>
        <div className="flex gap-2">
          <button type="button" onClick={() => setListOpen(true)} className={secondaryButton}>
            ToDo一覧
          </button>
          <button type="button" onClick={() => setDialogTodo(null)} className={primaryButton}>
            ＋ ToDoを追加
          </button>
        </div>
      </div>

      {error && <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>}

      {!loaded ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          今やることはありません。
        </div>
      ) : (
        <DashboardTable rows={rows} onEditTodo={setDialogTodo} />
      )}

      <TodoDialog
        open={dialogTodo !== undefined}
        todo={dialogTodo ?? undefined}
        onClose={() => setDialogTodo(undefined)}
      />
      <TodoListDialog open={listOpen} onClose={() => setListOpen(false)} />
      <TutorialDialog
        open={showTutorial}
        onDismiss={() => setTutorial({ dismissed: true })}
        onDone={() => setTutorial({ dismissed: true })}
      />
    </div>
  );
}
