/**
 * Generates packages/shared/samples/sample-data.json: fictional demo data (no real companies).
 *
 *   npm run sample:generate -w @jobdash/shared
 *
 * Dates are written relative to SAMPLE_BASE_DATE (Monday 2026-11-09). When the sample is loaded,
 * everything is shifted by whole weeks so that this week starts on the first Monday on or after today.
 * Next actions are placed on Tuesday of the base week or later, so they are always in the future.
 * Companies waiting for the other party (日程調整待ち / 選考結果待ち) have no next action.
 * The output is validated against the backup schema.
 */
import { writeFileSync } from 'node:fs';
import { backupSchema, type Backup } from '../src/backup';
import type { Agent } from '../src/agent';
import type { Company } from '../src/company';
import type { ActionStatus, SelectionPhase } from '../src/enums';
import { EMPTY_RESEARCH, type Research } from '../src/research';
import type { Interview, TimeSlot } from '../src/schedule';

const iso = (date: string, time = '09:00') => new Date(`${date}T${time}:00+09:00`).toISOString();

// ---------- agents ----------

const agentDefs = [
  { key: 'ma', name: '○○エージェント', shortName: 'MA', contactName: '佐藤 花子', phone: '03-0000-0001', memo: '連絡は平日10時〜18時。返信が早い。' },
  { key: 'sa', name: '△△エージェント', shortName: 'SA', contactName: '鈴木 一郎', phone: '03-0000-0002', memo: '求人紹介が多め。面接対策の模擬面接あり。' },
  { key: 'ba', name: '××エージェント', shortName: 'BA', contactName: '高橋 次郎', phone: '03-0000-0003', memo: '' },
] as const;
type AgentKey = (typeof agentDefs)[number]['key'];

const agents: Agent[] = agentDefs.map((a, i) => ({
  id: `sample-agent-${a.key}`,
  name: a.name,
  shortName: a.shortName,
  contactName: a.contactName,
  contactEmail: `contact@agent-${a.key}.example.com`,
  contactPhone: a.phone,
  url: `https://agent-${a.key}.example.com/`,
  memo: a.memo,
  version: 1,
  createdAt: iso(`2026-09-${String(20 + i).padStart(2, '0')}`),
  updatedAt: iso(`2026-09-${String(20 + i).padStart(2, '0')}`),
}));

// ---------- companies ----------

interface CompanyDef {
  name: string;
  phase: SelectionPhase;
  action: ActionStatus;
  agent?: AgentKey; // undefined = direct application
  nextActionAt?: string;
  details?: string;
  research?: Partial<Research>;
  interviews?: Interview[];
  preferredSlots?: TimeSlot[];
}

const iv = (stage: Interview['stage'], date: string, start: string, end: string): Interview => ({
  stage,
  start: `${date}T${start}`,
  end: `${date}T${end}`,
});
const slot = (date: string, start: string, end: string): TimeSlot => ({ start: `${date}T${start}`, end: `${date}T${end}` });

const active: CompanyDef[] = [
  {
    name: 'オムライスソリューションズ株式会社',
    phase: 'オファー/内定',
    action: '要対応',
    agent: 'ma',
    nextActionAt: '2026-11-13T18:00',
    details: '内定通知を受領。回答期限は 11/13（金）18:00。オファー面談で年収・入社日を確認済み。',
    research: {
      tags: ['自社サービス', 'SaaS'],
      rating: 3,
      interviewCount: 3,
      motivation: '自社 SaaS の開発に、要件定義から運用まで一貫して関われるため。',
      futureVision: '3 年以内にプロダクトの技術選定をリードできるエンジニアになる。',
      reverseQuestions: '入社後 3 か月の期待値\nチームのコードレビューの進め方',
      attractions: 'プロダクトの成長性が高い\n開発チームの裁量が大きい\nフルリモート可',
      concerns: '組織が急拡大しており、評価制度が整備途中',
    },
    interviews: [iv('一次面接', '2026-10-14', '10:00', '11:00'), iv('二次面接', '2026-10-22', '15:00', '16:00'), iv('最終面接', '2026-10-30', '13:00', '14:00')],
  },
  {
    name: 'カレーライスシステム株式会社',
    phase: 'オファー/内定',
    action: '日程調整待ち',
    agent: 'sa',
    details: '内定。オファー面談の日程をエージェント経由で調整中。',
    research: {
      tags: ['SI'],
      rating: 2,
      interviewCount: 2,
      motivation: '大規模システムの開発経験を積みたい。',
      attractions: '研修制度が充実している\n福利厚生が手厚い',
      concerns: '客先常駐の可能性がある',
    },
    interviews: [iv('一次面接', '2026-10-16', '14:00', '15:00'), iv('最終面接', '2026-10-28', '10:00', '11:00')],
  },
  {
    name: 'ラーメンプラットフォーム株式会社',
    phase: '最終面接',
    action: '要本番準備',
    agent: 'ma',
    nextActionAt: '2026-11-12T14:00',
    details: '最終面接は役員 2 名。事業戦略への理解を問われる見込み。',
    research: {
      tags: ['自社サービス', 'BtoC'],
      rating: 3,
      interviewCount: 3,
      motivation: '利用者の多い自社サービスで、パフォーマンス改善に取り組みたい。',
      futureVision: 'バックエンドのテックリードとして、開発基盤の改善を主導する。',
      reverseQuestions: '今後 1 年の事業上の重点\nエンジニアの評価の観点',
      attractions: 'サービスが先進的\n技術スタックが自分に合っている',
      concerns: '残業が多そう',
    },
    interviews: [iv('一次面接', '2026-10-20', '11:00', '12:00'), iv('二次面接', '2026-10-29', '16:00', '17:00'), iv('最終面接', '2026-11-12', '14:00', '15:00')],
  },
  {
    name: '唐揚げテクノロジー株式会社',
    phase: '二次面接',
    action: '選考結果待ち',
    agent: 'ba',
    research: {
      tags: ['受託開発'],
      rating: 2,
      interviewCount: 2,
      attractions: '多様な業界の案件に関われる',
      concerns: '面接官が無愛想',
    },
    interviews: [iv('一次面接', '2026-10-27', '10:00', '11:00'), iv('二次面接', '2026-11-06', '15:00', '16:00')],
  },
  {
    name: '餃子ソリューションズ株式会社',
    phase: '一次面接',
    action: '要本番準備',
    agent: 'sa',
    nextActionAt: '2026-11-10T16:00',
    research: { tags: ['SES'], rating: 1, interviewCount: 2, concerns: '配属先が面談まで決まらない' },
    interviews: [iv('一次面接', '2026-11-10', '16:00', '17:00')],
  },
  {
    name: 'プリンテクノロジー株式会社',
    phase: '一次面接',
    action: '要本番準備',
    agent: 'ma',
    nextActionAt: '2026-11-11T10:00',
    details: '一次面接はオンライン。カジュアル面談に近い形式とのこと。',
    research: {
      tags: ['自社サービス'],
      rating: 2,
      interviewCount: 3,
      motivation: 'ユーザーとの距離が近い開発がしたい。',
      attractions: 'デザインと開発の連携が密',
    },
    interviews: [iv('一次面接', '2026-11-11', '10:00', '11:00')],
  },
  {
    name: 'パンケーキシステム株式会社',
    phase: '一次面接',
    action: '日程調整待ち',
    agent: 'ba',
        details: '希望日時をエージェントに送付済み。',
    research: { tags: ['SaaS'], interviewCount: 2 },
    preferredSlots: [slot('2026-11-16', '13:00', '17:00'), slot('2026-11-17', '10:00', '12:00'), slot('2026-11-18', '15:00', '18:00')],
  },
  {
    name: 'たい焼きネットワークス株式会社',
    phase: '一次面接',
    action: '要日程調整',
    nextActionAt: '2026-11-10',
    details: '直接応募。採用担当から面接日程の候補を求められている。',
    research: { tags: ['自社サービス'] },
  },
  {
    name: 'マカロンソリューションズ株式会社',
    phase: '試験/課題',
    action: '要対応',
    agent: 'sa',
    nextActionAt: '2026-11-14T23:00',
    details: 'コーディング課題（提出期限 11/14 23:00）。',
    research: { tags: ['SI'], interviewCount: 2 },
  },
  { name: 'お味噌汁システム株式会社', phase: '書類選考', action: '選考結果待ち', agent: 'ma' },
  { name: 'コロッケテクノロジー株式会社', phase: '書類選考', action: '選考結果待ち', agent: 'ba' },
  { name: 'シュークリームシステム株式会社', phase: '書類選考', action: '選考結果待ち' },
  {
    name: '焼きそばテクノロジー株式会社',
    phase: '一次面接',
    action: '不通過',
    agent: 'ma',
    research: { tags: ['SES'] },
    interviews: [iv('一次面接', '2026-10-21', '13:00', '14:00')],
  },
];

const declined: CompanyDef[] = [
  { name: 'チャーハンネットワークス株式会社', phase: '一次面接', action: '辞退', agent: 'sa', details: '他社の選考を優先するため辞退。' },
  { name: '冷奴ネットワークス株式会社', phase: '一次面接', action: '辞退', agent: 'ba', details: '勤務地の条件が合わず辞退。' },
];

const rejectedNames = [
  '株式会社うどんシステムズ',
  'ナポリタンテクノロジー株式会社',
  'おにぎりソリューションズ株式会社',
  'ピザインフォメーション株式会社',
  'ハンバーガーシステム株式会社',
  '肉じゃがシステムズ株式会社',
  '茶碗蒸しソリューションズ株式会社',
  'エビフライシステム株式会社',
  '焼き鳥インフォメーション株式会社',
  '麻婆豆腐テクノロジー株式会社',
  'マヨネーズテクノロジー株式会社',
  'わさびソリューションズ株式会社',
  'チョコレートシステム株式会社',
  'かき氷インフォメーション株式会社',
  'ケチャップテクノロジー株式会社',
];
const rotation: (AgentKey | undefined)[] = ['ma', 'sa', 'ba', 'ma', 'sa', undefined];
const rejected: CompanyDef[] = rejectedNames.map((name, i) => ({
  name,
  phase: '書類選考',
  action: '不通過',
  agent: rotation[i % rotation.length],
}));

const defs = [...active, ...declined, ...rejected];

const companies: Company[] = defs.map((d, i) => {
  const n = String(i + 1).padStart(2, '0');
  const created = `2026-10-${String(1 + (i % 20)).padStart(2, '0')}`;
  const research = d.research ? { ...EMPTY_RESEARCH, ...d.research } : undefined;
  return {
    id: `sample-company-${n}`,
    companyName: d.name,
    companyUrl: `https://company-${n}.example.com/`,
    ...(d.agent && { agentId: `sample-agent-${d.agent}`, agentJobUrl: `https://agent-${d.agent}.example.com/jobs/${1000 + i}` }),
    phase: d.phase,
    action: d.action,
    ...(d.nextActionAt && { nextActionAt: d.nextActionAt }),
    details: d.details ?? '',
    ...(research && { research }),
    ...(d.interviews && { interviews: d.interviews }),
    ...(d.preferredSlots && { preferredSlots: d.preferredSlots }),
    version: 1,
    createdAt: iso(created),
    updatedAt: iso('2026-11-06', '18:00'),
  };
});

const backup: Backup = backupSchema.parse({
  app: 'jobdash',
  schemaVersion: 3,
  exportedAt: iso('2026-11-08', '12:00'),
  companies,
  agents,
});

const out = new URL('../samples/sample-data.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(backup, null, 2)}\n`);
console.log(`Wrote ${out.pathname}: ${backup.companies.length} companies, ${backup.agents.length} agents`);
