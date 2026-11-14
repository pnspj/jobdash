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
import { useEffect, useMemo, useRef, useState } from 'react';
import AutoTextarea from '@/components/ui/AutoTextarea';
import SaveStatus from '@/components/ui/SaveStatus';
import StarRating from '@/components/ui/StarRating';
import { inputBaseClass, inputClass, labelClass } from '@/components/ui/styles';
import TagInput from '@/components/ui/TagInput';
import { errorMessage } from '@/lib/apiClient';
import { useUpdateCompany } from '../api';
import MemoField from './MemoField';

interface Props {
  company: Company;
  /** Tags used by other companies, offered as suggestions. */
  tagSuggestions: string[];
}

/** Text is saved after this much idle time while typing (and right away on blur). */
const AUTOSAVE_DELAY_MS = 2000;

const isValidInterviewCount = (n: number | undefined) =>
  n === undefined || (Number.isInteger(n) && n >= 1 && n <= MAX_INTERVIEW_COUNT);

const TEXT_FIELDS: {
  key: 'motivation' | 'futureVision' | 'reverseQuestions' | 'attractions' | 'concerns';
  label: string;
  hint?: string;
}[] = [
  { key: 'attractions', label: '魅力的な点', hint: '1行に1項目' },
  { key: 'concerns', label: '不安な点', hint: '1行に1項目' },
  { key: 'motivation', label: '志望理由' },
  { key: 'futureVision', label: '入社後の将来像' },
  { key: 'reverseQuestions', label: '逆質問' },
];

/** Only the fields that differ from the saved research; cleared numbers are sent as null. */
function diff(saved: Research, draft: Research): ResearchPatch {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys({ ...saved, ...draft }) as (keyof Research)[]) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) patch[key] = draft[key] ?? null;
  }
  return patch as ResearchPatch;
}

/**
 * Company research, saved automatically: text fields on blur or after a pause in typing,
 * tags and the rating as soon as they change. Each save sends every field that differs from the saved data,
 * so a failed save is retried with the next one.
 */
export default function ResearchEditor({ company, tagSuggestions }: Props) {
  // Its own mutation so autosaves do not disable or report into the status section above
  const update = useUpdateCompany(company);
  const saved = useMemo(() => researchOf(company), [company]);
  const [draft, setDraft] = useState<Research>(saved);
  // `details` is a company field, but it is edited here as part of the research
  const [details, setDetails] = useState(company.details);

  const countValid = isValidInterviewCount(draft.interviewCount);
  // An invalid interview count is left out (and shown as an error) instead of failing the whole save
  const patch = diff(saved, countValid ? draft : { ...draft, interviewCount: saved.interviewCount });
  const researchDirty = Object.keys(patch).length > 0;
  const detailsDirty = details !== company.details;
  const dirty = researchDirty || detailsDirty;

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveSoon = useRef(false);
  const send = () => update.mutate({ ...(detailsDirty && { details }), ...(researchDirty && { research: patch }) });
  const save = () => {
    clearTimeout(timer.current);
    if (!dirty) return;
    // One save at a time: the effect below runs again when the response updates the company
    if (update.isPending) {
      saveSoon.current = true;
      return;
    }
    send();
  };
  const latest = useRef({ save, dirty, send });
  latest.current = { save, dirty, send };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reschedule on every edit and after each save
  useEffect(() => {
    if (!dirty) return;
    const delay = saveSoon.current ? 0 : AUTOSAVE_DELAY_MS;
    saveSoon.current = false;
    timer.current = setTimeout(() => latest.current.save(), delay);
    return () => clearTimeout(timer.current);
  }, [dirty, draft, details, company.version]);

  // Save what is left when leaving through the app (e.g. a link); queued after any save in flight
  useEffect(
    () => () => {
      if (latest.current.dirty) latest.current.send();
    },
    [],
  );
  // Closing or reloading the tab cannot save, so warn instead
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof Research>(key: K, value: Research[K], { now = false } = {}) => {
    if (now) saveSoon.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">企業研究</h2>
        <SaveStatus
          pending={update.isPending}
          error={update.isError ? errorMessage(update.error, '保存に失敗しました') : null}
          dirty={dirty}
          saved={update.isSuccess}
          onRetry={save}
          idleText="変更は自動で保存されます"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto_auto]">
        <div>
          <span className={labelClass}>タグ</span>
          <TagInput
            value={draft.tags}
            onChange={(tags) => set('tags', tags, { now: true })}
            suggestions={tagSuggestions}
            max={MAX_TAGS}
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
              value={draft.interviewCount ?? ''}
              onChange={(e) => set('interviewCount', e.target.value === '' ? undefined : Number(e.target.value))}
              onBlur={save}
              aria-invalid={!countValid}
              className={`${inputBaseClass} w-20`}
            />
            <span className="text-sm text-slate-500">回</span>
          </div>
          {countValid ? (
            <p className="mt-1 text-xs text-slate-500">求人情報より</p>
          ) : (
            <p className="mt-1 text-xs text-red-600">
              1〜{MAX_INTERVIEW_COUNT} の整数で入力してください（保存されません）
            </p>
          )}
        </div>
        <div>
          <span className={labelClass}>総合評価（志望度）</span>
          <StarRating value={draft.rating} onChange={(v) => set('rating', v as Rating | undefined, { now: true })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <MemoField
            id="research-details"
            label="企業メモ"
            hint="事業内容・求人情報など"
            value={details}
            onChange={setDetails}
            onCommit={save}
          />
        </div>
        {TEXT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelClass} htmlFor={`research-${f.key}`}>
              {f.label}
              {f.hint && <span className="ml-2 text-xs font-normal text-slate-400">{f.hint}</span>}
            </label>
            <AutoTextarea
              id={`research-${f.key}`}
              rows={5}
              value={draft[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              onBlur={save}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
