'use client';

import type { Agent } from '@jobdash/shared';
import { useState } from 'react';
import MemoField from '@/components/ui/MemoField';
import SaveStatus from '@/components/ui/SaveStatus';
import { errorMessage } from '@/lib/apiClient';
import { useAutosave } from '@/lib/useAutosave';
import { useUpdateAgent } from '../api';

/** The agent's memo (meetings, calls, emails...) as Markdown, saved automatically. */
export default function AgentMemo({ agent }: { agent: Agent }) {
  const update = useUpdateAgent(agent);
  const [memo, setMemo] = useState(agent.memo);
  const dirty = memo !== agent.memo;
  const { save } = useAutosave({
    dirty,
    pending: update.isPending,
    send: () => update.mutate({ memo }),
    watch: [memo, agent.version],
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">エージェントメモ</h2>
        <SaveStatus
          pending={update.isPending}
          error={update.isError ? errorMessage(update.error, '保存に失敗しました') : null}
          dirty={dirty}
          saved={update.isSuccess}
          onRetry={save}
          idleText="変更は自動で保存されます"
        />
      </div>
      <MemoField
        id="agent-memo"
        hint="面談・電話の履歴、メールの記録など"
        value={memo}
        onChange={setMemo}
        onCommit={save}
      />
    </div>
  );
}
