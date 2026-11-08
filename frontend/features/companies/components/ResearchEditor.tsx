'use client';

import {
  type Company,
  MAX_INTERVIEW_COUNT,
  MAX_TAGS,
  type Rating,
  type Research,
  type ResearchPatch,
  researchOf,
} from '@jobdash/shared';
import { useMemo, useState } from 'react';
import StarRating from '@/components/ui/StarRating';
import { inputClass, labelClass, primaryButton } from '@/components/ui/styles';
import TagInput from '@/components/ui/TagInput';
import { errorMessage } from '@/lib/apiClient';

interface Props {
  company: Company;
  /** Tags used by other companies, offered as suggestions. */
  tagSuggestions: string[];
  onSave: (patch: ResearchPatch) => Promise<unknown>;
}

const TEXT_FIELDS: {
  key: 'motivation' | 'futureVision' | 'reverseQuestions' | 'attractions' | 'concerns';
  label: string;
  hint?: string;
}[] = [
  { key: 'motivation', label: '志望理由' },
  { key: 'futureVision', label: '入社後の将来像' },
  { key: 'reverseQuestions', label: '逆質問' },
  { key: 'attractions', label: '魅力的な点', hint: '1行に1項目' },
  { key: 'concerns', label: '不安な点', hint: '1行に1項目' },
];

/** Only the fields that differ from the saved research; cleared numbers are sent as null. */
function diff(saved: Research, draft: Research): ResearchPatch {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys({ ...saved, ...draft }) as (keyof Research)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) patch[key] = draft[key] ?? null;
  }
  return patch as ResearchPatch;
}

export default function ResearchEditor({ company, tagSuggestions, onSave }: Props) {
  const saved = useMemo(() => researchOf(company), [company]);
  const [draft, setDraft] = useState<Research>(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = diff(saved, draft);
  const dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof Research>(key: K, value: Research[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
    } catch (err) {
      setError(errorMessage(err, '保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto_auto]">
        <div>
          <span className={labelClass}>タグ</span>
          <TagInput
            value={draft.tags}
            onChange={(tags) => set('tags', tags)}
            suggestions={tagSuggestions}
            max={MAX_TAGS}
            disabled={saving}
            firstLabel="代表"
          />
          <p className="mt-1 text-xs text-slate-500">先頭のタグは連絡用テキストで「A社（SI）」のように使われます。</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="interviewCount">
            面接回数
          </label>
          <div className="flex items-center gap-2">
            <input
              id="interviewCount"
              type="number"
              min={1}
              max={MAX_INTERVIEW_COUNT}
              disabled={saving}
              value={draft.interviewCount ?? ''}
              onChange={(e) => set('interviewCount', e.target.value === '' ? undefined : Number(e.target.value))}
              className={`${inputClass} w-20`}
            />
            <span className="text-sm text-slate-500">回</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">求人情報より</p>
        </div>
        <div>
          <span className={labelClass}>総合評価（志望度）</span>
          <StarRating value={draft.rating} onChange={(v) => set('rating', v as Rating | undefined)} disabled={saving} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelClass} htmlFor={`research-${f.key}`}>
              {f.label}
              {f.hint && <span className="ml-2 text-xs font-normal text-slate-400">{f.hint}</span>}
            </label>
            <textarea
              id={`research-${f.key}`}
              rows={5}
              disabled={saving}
              value={draft[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-600">未保存の変更があります</span>}
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(saved)}
            disabled={saving}
            className="text-sm text-slate-500 hover:underline"
          >
            変更を破棄
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={!dirty || saving} className={primaryButton}>
          {saving ? '保存中...' : '会社研究を保存'}
        </button>
      </div>
    </div>
  );
}
