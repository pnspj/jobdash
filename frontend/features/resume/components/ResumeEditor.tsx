'use client';

import { type Career, emptyCareer, emptyProject, type Project, type ResumeContent } from '@jobdash/shared';
import type { ReactNode } from 'react';
import { inputClass, labelClass, secondaryButton, sectionClass } from '@/components/ui/styles';
import PeriodInput from './PeriodInput';

type Update = (fn: (r: ResumeContent) => ResumeContent) => void;

const EMPLOYMENT_TYPES = ['正社員', '契約社員', '派遣社員', '業務委託', 'アルバイト'];

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
const replace = <T,>(list: T[], index: number, item: T) => list.map((x, i) => (i === index ? item : x));
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Amber box for interview notes, which are never included in outputs. */
function NotesBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 print:hidden">
      <p className="mb-2 text-sm font-semibold text-amber-800">
        {title}
        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium">出力されません</span>
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function OrderButtons({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  const btn = 'rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30';
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="上へ">
        ↑
      </button>
      <button
        type="button"
        className={btn}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        aria-label="下へ"
      >
        ↓
      </button>
      <button
        type="button"
        className={`${btn} text-red-600`}
        onClick={() => window.confirm(`この${label}を削除しますか？`) && onRemove()}
      >
        削除
      </button>
    </div>
  );
}

function ProjectEditor({ project, id, onChange }: { project: Project; id: string; onChange: (p: Project) => void }) {
  const set = <K extends keyof Project>(key: K, value: Project[K]) => onChange({ ...project, [key]: value });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div>
          <label className={labelClass} htmlFor={`${id}-name`}>
            プロジェクト名
          </label>
          <input
            id={`${id}-name`}
            value={project.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <span className={labelClass}>プロジェクト期間</span>
          <PeriodInput idPrefix={`${id}-period`} value={project.period} onChange={(v) => set('period', v)} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextArea
          id={`${id}-overview`}
          label="プロジェクト概要"
          value={project.overview}
          onChange={(v) => set('overview', v)}
          rows={3}
        />
        <TextArea
          id={`${id}-resp`}
          label="担当業務"
          value={project.responsibilities}
          onChange={(v) => set('responsibilities', v)}
          rows={3}
        />
        <TextArea
          id={`${id}-env`}
          label="言語・環境"
          value={project.environment}
          onChange={(v) => set('environment', v)}
          rows={2}
        />
        <TextArea id={`${id}-team`} label="チーム構成" value={project.team} onChange={(v) => set('team', v)} rows={2} />
      </div>
      <NotesBox title="面接対策メモ">
        <TextArea
          id={`${id}-hardships`}
          label="苦労したこと"
          value={project.interviewNotes.hardships}
          onChange={(v) => set('interviewNotes', { ...project.interviewNotes, hardships: v })}
          rows={3}
        />
      </NotesBox>
    </div>
  );
}

function CareerEditor({ career, index, onChange }: { career: Career; index: number; onChange: (c: Career) => void }) {
  const set = <K extends keyof Career>(key: K, value: Career[K]) => onChange({ ...career, [key]: value });
  const id = `career-${index}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div>
          <label className={labelClass} htmlFor={`${id}-name`}>
            企業名 <span className="text-red-500">*</span>
          </label>
          <input
            id={`${id}-name`}
            value={career.companyName}
            onChange={(e) => set('companyName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <span className={labelClass}>期間</span>
          <PeriodInput idPrefix={`${id}-period`} value={career.period} onChange={(v) => set('period', v)} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-employees`}>
            従業員数
          </label>
          <input
            id={`${id}-employees`}
            value={career.employees}
            placeholder="約300名"
            onChange={(e) => set('employees', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-type`}>
            雇用形態
          </label>
          <input
            id={`${id}-type`}
            list="employment-types"
            value={career.employmentType}
            onChange={(e) => set('employmentType', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">プロジェクト（{career.projects.length}）</h4>
        {career.projects.map((p, pi) => (
          <div key={pi} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">プロジェクト {pi + 1}</span>
              <OrderButtons
                index={pi}
                count={career.projects.length}
                label="プロジェクト"
                onMove={(to) => set('projects', move(career.projects, pi, to))}
                onRemove={() =>
                  set(
                    'projects',
                    career.projects.filter((_, i) => i !== pi),
                  )
                }
              />
            </div>
            <ProjectEditor
              project={p}
              id={`${id}-project-${pi}`}
              onChange={(np) => set('projects', replace(career.projects, pi, np))}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => set('projects', [...career.projects, emptyProject(career.period.to ?? thisMonth())])}
          className={secondaryButton}
        >
          ＋ プロジェクトを追加
        </button>
      </div>
    </div>
  );
}

/** Form for the whole resume. Interview notes are shown in amber boxes and never output. */
export default function ResumeEditor({ value, update }: { value: ResumeContent; update: Update }) {
  const setField = <K extends keyof ResumeContent>(key: K, v: ResumeContent[K]) => update((r) => ({ ...r, [key]: v }));

  return (
    <div className="space-y-6">
      <datalist id="employment-types">
        {EMPLOYMENT_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <section className={`${sectionClass} space-y-4`}>
        <div>
          <label className={labelClass} htmlFor="fullName">
            氏名
          </label>
          <input
            id="fullName"
            value={value.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
            className={`${inputClass} max-w-xs`}
          />
        </div>
        <TextArea
          id="summary"
          label="職務要約"
          value={value.summary}
          onChange={(v) => setField('summary', v)}
          rows={5}
        />
      </section>

      <section className={`${sectionClass} space-y-4`}>
        <h2 className="text-lg font-semibold">職務経歴</h2>
        {value.careers.map((c, ci) => (
          <div key={ci} className="rounded-lg border border-slate-300 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">{c.companyName || `企業 ${ci + 1}`}</span>
              <OrderButtons
                index={ci}
                count={value.careers.length}
                label="職務経歴"
                onMove={(to) => setField('careers', move(value.careers, ci, to))}
                onRemove={() =>
                  setField(
                    'careers',
                    value.careers.filter((_, i) => i !== ci),
                  )
                }
              />
            </div>
            <CareerEditor
              career={c}
              index={ci}
              onChange={(nc) => setField('careers', replace(value.careers, ci, nc))}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setField('careers', [...value.careers, emptyCareer(thisMonth())])}
          className={secondaryButton}
        >
          ＋ 職務経歴を追加
        </button>
      </section>

      <section className={`${sectionClass} space-y-4`}>
        <TextArea
          id="skills"
          label="活かせる経験・スキル"
          value={value.skills}
          onChange={(v) => setField('skills', v)}
          rows={6}
        />
        <TextArea id="selfPr" label="自己PR" value={value.selfPr} onChange={(v) => setField('selfPr', v)} rows={8} />
      </section>

      <NotesBox title="面接対策メモ（全体）">
        <TextArea
          id="strengths"
          label="強み"
          value={value.interviewNotes.strengths}
          onChange={(v) => setField('interviewNotes', { ...value.interviewNotes, strengths: v })}
        />
        <TextArea
          id="weaknesses"
          label="弱み"
          value={value.interviewNotes.weaknesses}
          onChange={(v) => setField('interviewNotes', { ...value.interviewNotes, weaknesses: v })}
        />
        <TextArea
          id="reasonForChange"
          label="転職理由"
          value={value.interviewNotes.reasonForChange}
          onChange={(v) => setField('interviewNotes', { ...value.interviewNotes, reasonForChange: v })}
        />
      </NotesBox>
    </div>
  );
}
