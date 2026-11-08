'use client';

import { isInterviewStageKey } from '@jobdash/shared';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { errorBox } from '@/components/ui/styles';
import ScheduleEditor, { type ScheduleMode } from '@/features/calendar/components/ScheduleEditor';
import { useCompanies, useCompany } from '@/features/companies/api';
import { errorMessage } from '@/lib/apiClient';
import { returnLabel, useReturnTo, withReturnTo } from '@/lib/returnTo';

export default function SchedulePage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">読み込み中...</p>}>
      <ScheduleScreen />
    </Suspense>
  );
}

function ScheduleScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const modeParam = useSearchParams().get('mode') ?? 'first';
  // Return target of the company detail page (e.g. the calendar), passed through this screen
  const returnTo = useReturnTo();
  const detailUrl = (companyId: string) => withReturnTo(`/companies/${companyId}`, returnTo);
  const mode: ScheduleMode = modeParam === 'preferred' || isInterviewStageKey(modeParam) ? modeParam : 'first';
  const { data: company, isPending, error } = useCompany(id);
  const { data: companies = [] } = useCompanies();

  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;
  if (!company) return <div className={errorBox}>{errorMessage(error, '企業の取得に失敗しました')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={detailUrl(company.id)} className="text-blue-600 hover:underline">
          ← {company.companyName} の詳細へ戻る
        </Link>
        {returnTo && (
          <Link href={returnTo} className="text-blue-600 hover:underline">
            {returnLabel(returnTo)}へ戻る
          </Link>
        )}
      </div>
      <h1 className="text-2xl font-bold">{company.companyName} の日程登録</h1>
      <ScheduleEditor
        key={`${company.id}:${mode}`}
        company={company}
        others={companies.filter((c) => c.id !== company.id)}
        mode={mode}
        onModeChange={(m) => router.replace(withReturnTo(`/companies/${company.id}/schedule?mode=${m}`, returnTo))}
      />
    </div>
  );
}
