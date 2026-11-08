'use client';

import { useState, type FormEvent } from 'react';
import { ACTION_STATUSES, SELECTION_PHASES, type CompanyInput } from '@/lib/types';

export const EMPTY_INPUT: CompanyInput = {
  companyName: '',
  companyUrl: '',
  agent: '',
  agentJobUrl: '',
  phase: '書類選考',
  action: '選考結果待ち',
  nextActionDate: '',
  nextActionTime: '',
  details: '',
};

interface Props {
  initialValue?: CompanyInput;
  submitLabel: string;
  onSubmit: (input: CompanyInput) => Promise<void>;
  onCancel?: () => void;
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function CompanyForm({ initialValue = EMPTY_INPUT, submitLabel, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<CompanyInput>({ ...EMPTY_INPUT, ...initialValue });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CompanyInput>(key: K, v: CompanyInput[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
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
            value={value.companyUrl ?? ''}
            onChange={(e) => set('companyUrl', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="agent">
            担当エージェント
          </label>
          <input id="agent" className={inputClass} value={value.agent} onChange={(e) => set('agent', e.target.value)} />
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
            value={value.agentJobUrl ?? ''}
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
            onChange={(e) => set('phase', e.target.value as CompanyInput['phase'])}
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
            onChange={(e) => set('action', e.target.value as CompanyInput['action'])}
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
            次回アクション日
          </label>
          <div className="flex gap-2">
            <input
              id="nextActionDate"
              type="date"
              className={inputClass}
              value={value.nextActionDate}
              onChange={(e) => set('nextActionDate', e.target.value)}
            />
            <input
              id="nextActionTime"
              type="time"
              aria-label="次回アクション時刻"
              className={`${inputClass} max-w-32`}
              disabled={!value.nextActionDate}
              value={value.nextActionTime ?? ''}
              onChange={(e) => set('nextActionTime', e.target.value)}
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
