'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isClosedAction } from '@jobdash/shared';
import { errorMessage } from '@/lib/apiClient';
import ExternalLink from '@/components/ui/ExternalLink';
import Modal from '@/components/ui/Modal';
import { errorBox, primaryButton } from '@/components/ui/styles';
import { useAgents, useCreateAgent } from '@/features/agents/api';
import AgentForm from '@/features/agents/components/AgentForm';
import { useCompanies } from '@/features/companies/api';

export default function AgentListPage() {
  const router = useRouter();
  const { data: agents = [], isPending, error } = useAgents();
  const { data: companies = [] } = useCompanies();
  const create = useCreateAgent();
  const [modalOpen, setModalOpen] = useState(false);

  // agentId -> { total, active } company counts
  const counts = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    for (const c of companies) {
      if (!c.agentId) continue;
      const entry = map.get(c.agentId) ?? { total: 0, active: 0 };
      entry.total++;
      if (!isClosedAction(c.action)) entry.active++;
      map.set(c.agentId, entry);
    }
    return map;
  }, [companies]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">エージェント</h1>
          <p className="text-sm text-slate-500">{agents.length} 件</p>
        </div>
        <button onClick={() => setModalOpen(true)} className={primaryButton}>
          ＋ エージェントを追加
        </button>
      </div>

      {error && <div className={`mb-4 ${errorBox}`}>{errorMessage(error, '一覧の取得に失敗しました')}</div>}

      {isPending ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          エージェントが登録されていません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">略称</th>
                <th className="px-4 py-3">エージェント名</th>
                <th className="px-4 py-3">担当者</th>
                <th className="px-4 py-3">連絡先</th>
                <th className="px-4 py-3 text-right">選考中 / 全企業</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((a) => {
                const count = counts.get(a.id) ?? { total: 0, active: 0 };
                return (
                  <tr key={a.id} onClick={() => router.push(`/agents/${a.id}`)} className="cursor-pointer hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-mono font-medium">
                      <Link href={`/agents/${a.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {a.shortName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink href={a.url} marker stopPropagation>
                        {a.name}
                      </ExternalLink>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.contactName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.contactEmail && (
                        <a href={`mailto:${a.contactEmail}`} onClick={(e) => e.stopPropagation()} className="block hover:underline">
                          {a.contactEmail}
                        </a>
                      )}
                      {a.contactPhone && <span className="block">{a.contactPhone}</span>}
                      {!a.contactEmail && !a.contactPhone && '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {count.active} / {count.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title="エージェントを追加" onClose={() => setModalOpen(false)}>
        <AgentForm
          submitLabel="登録する"
          onSubmit={async (input) => {
            await create.mutateAsync(input);
            setModalOpen(false);
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
