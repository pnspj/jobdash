'use client';

import {
  ACTION_STATUSES,
  type ActionStatus,
  type Company,
  type CompanyInput,
  joinLocalDateTime,
  SELECTION_PHASES,
  type SelectionPhase,
  splitLocalDateTime,
} from '@jobdash/shared';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import TimeSelect from '@/components/ui/TimeSelect';
import { agentDisplayName, useAgents } from '@/features/agents/api';
import { errorMessage } from '@/lib/apiClient';

/** Form state: every field is a string; next action is edited as separate date and time. */
interface FormValues {
  companyName: string;
  companyUrl: string;
  agentId: string;
  agentJobUrl: string;
  phase: SelectionPhase;
  action: ActionStatus;
  nextActionDate: string;
  nextActionTime: string;
  details: string;
}

function toFormValues(c?: Company): FormValues {
  const { date, time } = splitLocalDateTime(c?.nextActionAt);
  return {
    companyName: c?.companyName ?? '',
    companyUrl: c?.companyUrl ?? '',
    agentId: c?.agentId ?? '',
    agentJobUrl: c?.agentJobUrl ?? '',
    phase: c?.phase ?? '書類選考',
    action: c?.action ?? '選考結果待ち',
    nextActionDate: date,
    nextActionTime: time,
    details: c?.details ?? '',
  };
}

/** Empty strings are kept so that a PATCH clears the corresponding fields. */
function toInput({ nextActionDate, nextActionTime, ...rest }: FormValues): CompanyInput {
  return { ...rest, nextActionAt: joinLocalDateTime(nextActionDate, nextActionTime) ?? '' };
}

interface Props {
  /** Existing company to edit; omit to create a new one. */
  company?: Company;
  submitLabel: string;
  onSubmit: (input: CompanyInput) => Promise<unknown>;
  onCancel?: () => void;
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function CompanyForm({ company, submitLabel, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<FormValues>(() => toFormValues(company));
  const { data: agents = [] } = useAgents();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormValues>(key: K, v: FormValues[K]) => setValue((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(toInput(value));
    } catch (err) {
      setError(errorMessage(err, '保存に失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="companyName">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            className={inputClass}
            required
            value={value.companyName}
            onChange={(e) => set('companyName', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="companyUrl">
            会社URL
          </label>
          <input
            id="companyUrl"
            type="url"
            className={inputClass}
            placeholder="https://"
            value={value.companyUrl}
            onChange={(e) => set('companyUrl', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="agentId">
            担当エージェント
          </label>
          <select
            id="agentId"
            className={inputClass}
            value={value.agentId}
            onChange={(e) => set('agentId', e.target.value)}
          >
            <option value="">（なし・直接応募）</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {agentDisplayName(a)}
              </option>
            ))}
            {/* Keep an unknown id selectable so editing does not silently drop it */}
            {value.agentId && !agents.some((a) => a.id === value.agentId) && (
              <option value={value.agentId}>（不明なエージェント）</option>
            )}
          </select>
          <Link href="/agents" target="_blank" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
            エージェントを登録・編集 ↗
          </Link>
        </div>

        <div>
          <label className={labelClass} htmlFor="agentJobUrl">
            エージェント求人URL
          </label>
          <input
            id="agentJobUrl"
            type="url"
            className={inputClass}
            placeholder="https://"
            value={value.agentJobUrl}
            onChange={(e) => set('agentJobUrl', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phase">
            選考フェーズ
          </label>
          <select
            id="phase"
            className={inputClass}
            value={value.phase}
            onChange={(e) => set('phase', e.target.value as SelectionPhase)}
          >
            {SELECTION_PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="action">
            アクション
          </label>
          <select
            id="action"
            className={inputClass}
            value={value.action}
            onChange={(e) => set('action', e.target.value as ActionStatus)}
          >
            {ACTION_STATUSES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="nextActionDate">
            次回アクション日時
          </label>
          <div className="flex gap-2">
            <input
              id="nextActionDate"
              type="date"
              className={inputClass}
              value={value.nextActionDate}
              onChange={(e) => set('nextActionDate', e.target.value)}
            />
            <TimeSelect
              id="nextActionTime"
              className={`${inputClass} w-28 shrink-0`}
              disabled={!value.nextActionDate}
              value={value.nextActionTime}
              onChange={(v) => set('nextActionTime', v)}
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="details">
            詳細
          </label>
          <textarea
            id="details"
            rows={6}
            className={inputClass}
            value={value.details}
            onChange={(e) => set('details', e.target.value)}
          />
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
