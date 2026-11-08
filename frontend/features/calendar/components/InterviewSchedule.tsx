import Link from 'next/link';
import { INTERVIEW_STAGES, formatSlot, stageKeyOf, type Company } from '@jobdash/shared';
import { secondaryButton } from '@/components/ui/styles';
import { withReturnTo } from '@/lib/returnTo';
import { PREFERRED_COLOR, STAGE_COLORS } from '../lib/events';
import SlotTextExport from './SlotTextExport';

const DISPLAY_FORMAT = '{月}/{日}（{曜}）{開始}～{終了日}{終了}';

/** Interview dates and preferred slots of a company, with links to the registration calendar. */
export default function InterviewSchedule({ company, returnTo }: { company: Company; returnTo?: string }) {
  // Keep the detail page's return target so that the schedule screen can link back to it
  const scheduleUrl = (mode: string) => withReturnTo(`/companies/${company.id}/schedule?mode=${mode}`, returnTo);
  const preferred = company.preferredSlots ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">面接日時</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {INTERVIEW_STAGES.map((stage) => {
            const interview = company.interviews?.find((i) => i.stage === stage);
            return (
              <li key={stage} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                  <span className="w-20 font-medium">{stage}</span>
                  <span className={`tabular-nums ${interview ? '' : 'text-slate-400'}`}>
                    {interview ? formatSlot(interview, DISPLAY_FORMAT) : '未登録'}
                  </span>
                </span>
                <Link href={scheduleUrl(stageKeyOf(stage))} className={`${secondaryButton} py-1`}>
                  {interview ? '変更' : '登録'}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: PREFERRED_COLOR }}>
            面接希望日時（{preferred.length}件）
          </h3>
          <Link href={scheduleUrl('preferred')} className={`${secondaryButton} py-1`}>
            {preferred.length > 0 ? '編集' : '登録'}
          </Link>
        </div>
        {preferred.length === 0 ? (
          <p className="text-sm text-slate-400">未登録</p>
        ) : (
          <>
            <ul className="mb-3 space-y-0.5 text-sm tabular-nums">
              {preferred.map((s) => (
                <li key={`${s.start}-${s.end}`}>{formatSlot(s, DISPLAY_FORMAT)}</li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer text-sm text-blue-600">エージェント連絡用テキスト</summary>
              <div className="mt-2">
                <SlotTextExport slots={preferred} />
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
