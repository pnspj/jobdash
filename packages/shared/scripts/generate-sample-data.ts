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
import type { Agent } from '../src/agent';
import { type Backup, backupSchema } from '../src/backup';
import type { Company } from '../src/company';
import type { ActionStatus, SelectionPhase } from '../src/enums';
import { EMPTY_RESEARCH, type Research } from '../src/research';
import { type Resume, resumeContentSchema } from '../src/resume';
import type { Interview, TimeSlot } from '../src/schedule';
import type { Todo } from '../src/todo';

const iso = (date: string, time = '09:00') => new Date(`${date}T${time}:00+09:00`).toISOString();
/** Multi-line Markdown memo. Dates in memo text are not shifted on load (only data fields are). */
const md = (...lines: string[]) => lines.join('\n');

// ---------- agents ----------

const agentDefs = [
  {
    key: 'ma',
    name: '○○エージェント',
    shortName: 'MA',
    contactName: '佐藤 花子',
    phone: '03-0000-0001',
    memo: md(
      '連絡は平日 10 時〜18 時。返信が早い。',
      '',
      '## 2026/09/24 初回面談（オンライン）',
      '担当 佐藤様',
      'テンポよく話を進めてくれる。こちらの希望をよく覚えている',
      '',
      '話したこと',
      '- 希望条件の確認',
      '  - 年収は現状維持以上',
      '  - できれば自社サービス、SI・受託も可',
      '- 職務経歴書の添削',
      '  - 数字（チーム人数、期間、成果）をもっと入れる',
      '  - 個人開発は **URL を載せる** と良い',
      '- 紹介予定: 自社サービス系 3 社',
      '',
      '## 2026/10/31 電話',
      '- オムライスソリューションズの内定連絡',
      '- 回答期限は 11/13（金）18:00、延長は難しい',
      '- ラーメンプラットフォームの最終面接と比較して決めたいと伝えた',
    ),
  },
  {
    key: 'sa',
    name: '△△エージェント',
    shortName: 'SA',
    contactName: '鈴木 一郎',
    phone: '03-0000-0002',
    memo: md(
      '求人紹介が多め。面接対策の模擬面接あり。',
      '',
      '## 2026/09/25 初回面談（来社）',
      '担当 鈴木様',
      '業界歴が長く、SI 企業の内情に詳しい',
      '',
      '- SI・SES の求人が中心。自社サービスは少なめ',
      '- 面接では「なぜ受託から移りたいか」を必ず聞かれる',
      '  - 転職理由は **前向きな表現** で話す',
      '- 模擬面接は平日 19 時以降なら対応可',
      '',
      '## 2026/11/04 メール',
      '- 新着求人 5 件の紹介 → 11/13 までに応募可否を返信',
      '- 求人一覧: https://agent-sa.example.com/mypage/jobs',
    ),
  },
  {
    key: 'ba',
    name: '××エージェント',
    shortName: 'BA',
    contactName: '高橋 次郎',
    phone: '03-0000-0003',
    memo: md(
      '## 2026/09/26 初回面談',
      '担当 高橋様',
      '若いけど落ち着いてしっかりした話し方、安心感',
      '',
      '話したこと',
      '- エージェントさんの紹介',
      '- こちらの自己紹介や転職背景説明',
      '- 転職市場の説明',
      '  - Java 案件は安定',
      '  - TypeScript が増えている',
      '  - AWS 経験あると大きく加点',
      '- 企業選びの方向性',
      '  - リーダー経験は大いにアピールできる',
      '  - 自己学習でアプリ公開も強い',
    ),
  },
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
const slot = (date: string, start: string, end: string): TimeSlot => ({
  start: `${date}T${start}`,
  end: `${date}T${end}`,
});

const active: CompanyDef[] = [
  {
    name: 'オムライスソリューションズ株式会社',
    phase: 'オファー/内定',
    action: '要対応',
    agent: 'ma',
    nextActionAt: '2026-11-13T18:00',
    details: md(
      '内定通知を受領。**回答期限は 11/13（金）18:00**',
      '',
      '## 2026/11/06 オファー面談',
      '',
      '| 項目 | 内容 |',
      '| --- | --- |',
      '| 年収 | 620 万円（現職 +70 万円） |',
      '| 入社日 | 2027/02/01 を希望、調整可 |',
      '| 働き方 | フルリモート、月 1 回出社 |',
      '| 配属 | 決済プロダクトのバックエンド |',
      '',
      '- 試用期間 3 か月（条件の変更なし）',
      '- 評価は半期ごと。等級表を後日もらう',
    ),
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
    interviews: [
      iv('一次面接', '2026-10-14', '10:00', '11:00'),
      iv('二次面接', '2026-10-22', '15:00', '16:00'),
      iv('最終面接', '2026-10-30', '13:00', '14:00'),
    ],
  },
  {
    name: 'カレーライスシステム株式会社',
    phase: 'オファー/内定',
    action: '日程調整待ち',
    agent: 'sa',
    details: md(
      '内定。オファー面談の日程をエージェント経由で調整中。',
      '',
      '確認したいこと',
      '- [ ] 配属先（客先常駐の有無）',
      '- [ ] 残業時間の実績',
      '- [x] 研修制度（一次面接で確認済み）',
    ),
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
    details: md(
      '## 2026/10/16 面接前情報収集',
      '',
      '- 企業サイト',
      '  - 国内拠点多い',
      '  - 会員数 800 万人のサービスを運営',
      '- 採用サイト',
      '  - このインタビュー記事は自分の将来像に近そう',
      '  - https://company-03.example.com/recruit/interview/05',
      '- IR',
      '  - https://company-03.example.com/ir',
      '  - 増収減益、投資フェーズか？',
      '- 口コミ',
      '  - https://kuchikomi.example.com/companies/123456',
      '  - クリティカルに悪いことはなさそう',
      '  - 繁忙期の残業は多めという声あり',
      '',
      '## 2026/10/20 11:00 一次面接メモ',
      '',
      '人事 田中様 明るくはきはきした女性',
      '現場チームリーダー 伊藤様 黒縁メガネでやや堅い印象',
      '',
      '- 会社説明',
      '- 自己紹介',
      '- 志望動機',
      '- 伊藤様から質問',
      '  - 直近のシステムの詳細',
      '  - サブリーダーの業務',
      '  - 大変だったこと',
      '  - 個人開発で使っている技術',
      '- 逆質問',
      '  - チームの開発プロセス → スクラム、2 週間スプリント',
      '',
      '## 2026/10/29 16:00 二次面接メモ',
      '',
      '開発部長 山本様、伊藤様',
      '',
      '- 技術的な深掘りが中心',
      '  - 需要予測 API のパフォーマンス改善',
      '  - 障害対応の進め方',
      '- **手応えあり**。伊藤様の表情も柔らかかった',
      '',
      '## 最終面接に向けて',
      '- 役員 2 名。事業戦略への理解を問われる見込み',
      '- 中期経営計画を読み直す',
    ),
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
    interviews: [
      iv('一次面接', '2026-10-20', '11:00', '12:00'),
      iv('二次面接', '2026-10-29', '16:00', '17:00'),
      iv('最終面接', '2026-11-12', '14:00', '15:00'),
    ],
  },
  {
    name: '唐揚げテクノロジー株式会社',
    phase: '二次面接',
    action: '選考結果待ち',
    agent: 'ba',
    details: md(
      '## 2026/11/06 15:00 二次面接メモ',
      '',
      '技術責任者 小林様',
      '',
      '- 過去案件の設計判断について質問多め',
      '- 「お客様との折衝経験」を重視している様子',
      '- 結果は 1 週間以内に連絡',
    ),
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
    details: md(
      '一次面接はオンライン。カジュアル面談に近い形式とのこと。',
      '',
      '## 2026/11/09 面接前情報収集',
      '- プロダクト: 家計簿アプリ https://company-06.example.com/app',
      '- テックブログ: https://company-06.example.com/blog',
      '  - Next.js への移行記事が参考になる',
      '- 質問したいこと',
      '  - デザイナーとの協業の進め方',
    ),
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
    preferredSlots: [
      slot('2026-11-16', '13:00', '17:00'),
      slot('2026-11-17', '10:00', '12:00'),
      slot('2026-11-18', '15:00', '18:00'),
    ],
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
    details: md(
      'コーディング課題（**提出期限 11/14 23:00**）',
      '',
      '- [x] 課題文を読む',
      '- [x] API 設計',
      '- [ ] 実装・テスト',
      '- [ ] README を書いて提出',
    ),
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
  {
    name: 'チャーハンネットワークス株式会社',
    phase: '一次面接',
    action: '辞退',
    agent: 'sa',
    details: '他社の選考を優先するため辞退。',
  },
  {
    name: '冷奴ネットワークス株式会社',
    phase: '一次面接',
    action: '辞退',
    agent: 'ba',
    details: '勤務地の条件が合わず辞退。',
  },
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
    ...(d.agent && {
      agentId: `sample-agent-${d.agent}`,
      agentJobUrl: `https://agent-${d.agent}.example.com/jobs/${1000 + i}`,
    }),
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

// ---------- to-dos ----------
// Open to-dos are dated Tuesday of the base week or later (or undated), so they stay in the future when loaded.

interface TodoDef {
  title: string;
  details?: string;
  nextActionAt?: string;
  done?: string; // completion date (YYYY-MM-DD)
  agent?: AgentKey; // undefined = dashboard to-do
}

const todoDefs: TodoDef[] = [
  // Agent to-dos
  { agent: 'ma', title: 'エージェント登録', done: '2026-09-20' },
  { agent: 'ma', title: '面談', details: 'オンライン。希望条件と職務経歴をすり合わせ', done: '2026-09-24' },
  { agent: 'ma', title: '履歴書・職務経歴書提出', done: '2026-09-28' },
  {
    agent: 'ma',
    title: '面接対策',
    details: 'ラーメンプラットフォームの最終面接に向けた模擬面接',
    nextActionAt: '2026-11-11T19:00',
  },
  { agent: 'ma', title: '進捗連絡・相談', details: 'オファーの回答期限について相談', nextActionAt: '2026-11-12' },
  { agent: 'sa', title: 'エージェント登録', done: '2026-09-21' },
  { agent: 'sa', title: '面談', done: '2026-09-25' },
  {
    agent: 'sa',
    title: '求人確認・応募依頼',
    details: '紹介された 5 件を確認して、応募するものを返信する',
    nextActionAt: '2026-11-13T12:00',
  },
  { agent: 'ba', title: 'エージェント登録', done: '2026-09-22' },
  { agent: 'ba', title: '進捗連絡・相談', details: '他社の選考状況を共有する' },
  // Dashboard to-dos
  { title: 'エージェントに登録する', done: '2026-09-20' },
  { title: '職務経歴書に現在の業務を書く', done: '2026-09-27' },
  { title: '現職の有給休暇の残りを確認する', details: '面接日程の調整に使う', nextActionAt: '2026-11-10T12:00' },
  { title: '個人開発の Web サービスの README を整える', details: 'ポートフォリオとして面接で見せられるように' },
];

const todos: Todo[] = todoDefs.map((d, i) => {
  const created = d.done ?? `2026-10-${String(10 + (i % 15)).padStart(2, '0')}`;
  return {
    id: `sample-todo-${String(i + 1).padStart(2, '0')}`,
    title: d.title,
    details: d.details ?? '',
    ...(d.nextActionAt && { nextActionAt: d.nextActionAt }),
    status: d.done ? 'done' : 'open',
    ...(d.done && { completedAt: iso(d.done, '18:00') }),
    ...(d.agent && { agentId: `sample-agent-${d.agent}` }),
    version: 1,
    createdAt: iso(created),
    updatedAt: iso(d.done ?? created, '18:00'),
  };
});

// ---------- resume (persona: docs/sample-persona.md) ----------

const resume: Resume = {
  ...resumeContentSchema.parse({
    fullName: '序部 大介',
    summary:
      '大学卒業後、未経験から SES 企業に入社し、Java を中心に保険・物流・小売の業務システム開発に 3 年半従事しました。3 件目の案件では自社チーム 4 名のリーダーとして、進捗管理と若手の育成を担当しました。\n' +
      '2023 年からは受託開発企業で、Java・Python・TypeScript を用いた Web アプリケーション開発に携わり、現在は需要予測ダッシュボード開発のサブリーダーを務めています。',
    careers: [
      {
        companyName: 'すき焼きソフトウェア株式会社',
        period: { from: '2023-10' },
        employees: '約80名',
        employmentType: '正社員',
        projects: [
          {
            name: '製造業向け需要予測ダッシュボードの開発',
            period: { from: '2025-01' },
            overview: '販売実績から需要を予測し、生産計画に活用するダッシュボードの開発。',
            responsibilities: 'サブリーダーとしてタスク分解・レビュー\n予測 API と画面の実装',
            environment: 'Python, FastAPI, TypeScript, Next.js, AWS',
            team: '7名',
            interviewNotes: {
              hardships: '顧客要望の優先度づけ。リーダーと分担し、顧客との定例で合意を取ってから着手する運用にした。',
            },
          },
          {
            name: '自治体向け施設予約 Web アプリの開発',
            period: { from: '2023-10', to: '2024-12' },
            overview: '公共施設の空き状況確認・予約を行う市民向け Web アプリの開発。',
            responsibilities: 'フロントエンド・バックエンドの実装\nアクセシビリティ対応',
            environment: 'Java 17, Spring Boot, TypeScript, React, AWS',
            team: '6名',
            interviewNotes: {
              hardships:
                '初めての React で学習が追いつかず、休日に個人開発で練習して半年で主要画面を任されるようになった。',
            },
          },
        ],
        interviewNotes: {
          reasonForJoining:
            '自社で受託開発を行い、設計から運用まで一貫して関われる。Java 以外の言語やフロントエンドにも挑戦できる。',
          reasonForLeaving:
            '役割（リーダー経験）と技術（フロントエンド・クラウド・プロダクト開発）の幅を広げたい。\nできれば自社サービスで、ユーザーに近い開発がしたい。',
        },
      },
      {
        companyName: '株式会社おでんシステムズ',
        period: { from: '2020-04', to: '2023-09' },
        employees: '約300名',
        employmentType: '正社員',
        projects: [
          {
            name: '小売業向けポイントシステムのリプレース',
            period: { from: '2022-10', to: '2023-09' },
            overview: 'オンプレミスのポイント管理システムを AWS 上に再構築。',
            responsibilities: '自社チームリーダーとして進捗・品質管理、若手 2 名の育成\nバッチ処理の設計・実装',
            environment: 'Java 17, Spring Boot, MySQL, AWS（EC2, RDS, S3）',
            team: '15名（うち自社4名をリード）',
            interviewNotes: {
              hardships: 'メンバーの稼働に偏りが出た。週次でタスクを見直し、ペア作業で属人化を減らした。',
            },
          },
          {
            name: '物流会社向け倉庫管理システムの新規開発',
            period: { from: '2021-10', to: '2022-09' },
            overview: '複数倉庫の在庫・入出荷を一元管理する Web システムの新規開発。',
            responsibilities: '基本設計〜テスト\n入出荷 API の設計・実装',
            environment: 'Java 11, Spring Boot, PostgreSQL, Docker',
            team: '8名',
            interviewNotes: {
              hardships: '仕様確認の前に実装を進めて手戻りを出した。以後、着手前に認識合わせの場を設けるようにした。',
            },
          },
          {
            name: '保険会社向け契約管理システムの保守開発',
            period: { from: '2020-07', to: '2021-09' },
            overview: '生命保険の契約管理システムにおける法改正対応と機能追加。',
            responsibilities: '詳細設計、実装、単体・結合テスト\n障害調査と再発防止策の検討',
            environment: 'Java 8, Spring Framework, Oracle Database, Linux',
            team: '10名（うち自社2名）',
            interviewNotes: {
              hardships:
                '既存コードの影響範囲が広く、テスト観点の洗い出しに苦労した。有識者へのヒアリングでテスト観点表を作った。',
            },
          },
        ],
        interviewNotes: {
          reasonForJoining: '未経験でも研修があり、いろいろな業界の現場で経験を積めると考えた。',
          reasonForLeaving:
            '客先常駐で案件を選べず、技術の幅が広がりにくかった。\n自社で Web アプリを一から作れる環境で経験を積みたかった。',
        },
      },
    ],
    skills:
      '・Java / Spring Boot による業務システムの設計・開発（約 5 年）\n' +
      '・TypeScript / React / Next.js、Python / FastAPI による Web アプリケーション開発\n' +
      '・AWS 上でのシステム構築・運用\n' +
      '・4 名チームのリーダー、7 名チームのサブリーダーとしての進捗管理・レビュー・育成\n' +
      '・個人開発: Claude を活用した Web サービスを Cloudflare で公開',
    selfPr:
      '【周囲を巻き込む推進力】\n' +
      '明るく社交的な性格を活かし、チーム内外の関係者と積極的にコミュニケーションを取ってきました。リーダーとしては、週次のタスク見直しとペア作業の導入で、メンバーの稼働の偏りを解消しました。\n' +
      '【継続的な学習】\n' +
      '未経験から入社し、業務に加えて休日も個人開発や勉強会への参加を続けています。新しい技術を自分で試し、業務に還元することを大切にしています。',
    interviewNotes: {
      strengths: '体力と粘り強さ\n明るく社交的で、チーム内外の調整が得意\n未経験から現場で成長してきた学習力',
      weaknesses: '先走って失敗することがある\n→ 着手前に関係者と認識を合わせることを意識している',
    },
  }),
  version: 1,
  updatedAt: iso('2026-11-06', '20:00'),
};

const backup: Backup = backupSchema.parse({
  app: 'jobdash',
  schemaVersion: 3,
  exportedAt: iso('2026-11-08', '12:00'),
  companies,
  agents,
  resume,
  todos,
});

const out = new URL('../samples/sample-data.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(backup, null, 2)}\n`);
console.log(
  `Wrote ${out.pathname}: ${backup.companies.length} companies, ${backup.agents.length} agents, ${backup.todos?.length ?? 0} todos, resume: ${backup.resume ? 'yes' : 'no'}`,
);
