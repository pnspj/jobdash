'use client';

import { type Company, formatLocalDateTime, isActionRequired, isClosedAction, todayLocalDate } from '@jobdash/shared';
import { useRouter } from 'next/navigation';
import ExternalLink from '@/components/ui/ExternalLink';
import { useAgentLookup } from '@/features/agents/api';
import { withReturnTo } from '@/lib/returnTo';
import { ActionBadge, PhaseBadge } from './Badges';

/**
 * Company list table. Rows navigate to the detail page; name/agent cells link to external URLs.
 * `returnTo` is passed to the detail page as its back-link target.
 */
export default function CompanyTable({ companies, returnTo }: { companies: Company[]; returnTo?: string }) {
  const router = useRouter();
  const today = todayLocalDate();
  const { shortName: agentShortName } = useAgentLookup();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">企業名</th>
            <th className="px-4 py-3">エージェント</th>
            <th className="px-4 py-3">選考フェーズ</th>
            <th className="px-4 py-3">アクション</th>
            <th className="px-4 py-3">次回アクション日時</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {companies.map((c) => {
            const closed = isClosedAction(c.action);
            const date = c.nextActionAt?.slice(0, 10) ?? '';
            const overdue = date !== '' && date < today && !closed;
            const isToday = date === today;
            return (
              <tr
                key={c.id}
                onClick={() => router.push(withReturnTo(`/companies/${c.id}`, returnTo))}
                className={`cursor-pointer hover:bg-blue-50/50 ${closed ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  <ExternalLink href={c.companyUrl} marker stopPropagation>
                    {c.companyName}
                  </ExternalLink>
                  {isActionRequired(c.action) && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" title="要対応" />
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <ExternalLink href={c.agentJobUrl} marker stopPropagation>
                    {agentShortName(c.agentId) || (c.agentJobUrl ? '求人' : '-')}
                  </ExternalLink>
                </td>
                <td className="px-4 py-3">
                  <PhaseBadge phase={c.phase} />
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={c.action} />
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${
                    overdue ? 'font-semibold text-red-600' : isToday ? 'font-semibold text-amber-600' : 'text-slate-700'
                  }`}
                >
                  {formatLocalDateTime(c.nextActionAt) || '-'}
                  {overdue && <span className="ml-1 text-xs">(期限切れ)</span>}
                  {isToday && <span className="ml-1 text-xs">(今日)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
