'use client';

import type { Agent, AgentInput } from '@jobdash/shared';
import { type FormEvent, useState } from 'react';
import { inputClass, labelClass, primaryButton, secondaryButton } from '@/components/ui/styles';
import { errorMessage } from '@/lib/apiClient';

/** The memo is not part of the form: it is edited (and autosaved) on the agent page. */
type FormValues = Required<{ [K in Exclude<keyof AgentInput, 'memo'>]: string }>;

const toFormValues = (a?: Agent): FormValues => ({
  name: a?.name ?? '',
  shortName: a?.shortName ?? '',
  contactName: a?.contactName ?? '',
  contactEmail: a?.contactEmail ?? '',
  contactPhone: a?.contactPhone ?? '',
  url: a?.url ?? '',
});

interface Props {
  agent?: Agent;
  submitLabel: string;
  /** Empty strings are sent as-is so that a PATCH clears the fields. */
  onSubmit: (input: AgentInput) => Promise<unknown>;
  onCancel?: () => void;
}

export default function AgentForm({ agent, submitLabel, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState<FormValues>(() => toFormValues(agent));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof FormValues) => ({
    id: `agent-${key}`,
    value: value[key],
    onChange: (e: { target: { value: string } }) => setValue((prev) => ({ ...prev, [key]: e.target.value })),
    className: inputClass,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(errorMessage(err, '保存に失敗しました'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className={labelClass} htmlFor="agent-name">
            エージェント名 <span className="text-red-500">*</span>
          </label>
          <input required placeholder="○○エージェント" {...field('name')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="agent-shortName">
            略称 <span className="text-red-500">*</span>
          </label>
          <input required placeholder="MA" {...field('shortName')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="agent-contactName">
            担当者名
          </label>
          <input {...field('contactName')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="agent-contactPhone">
            担当者電話番号
          </label>
          <input type="tel" {...field('contactPhone')} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="agent-contactEmail">
            担当者メールアドレス
          </label>
          <input type="email" {...field('contactEmail')} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="agent-url">
            エージェントURL
          </label>
          <input type="url" placeholder="https://" {...field('url')} />
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButton}>
            キャンセル
          </button>
        )}
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
