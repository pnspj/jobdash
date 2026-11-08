import { describe, expect, test } from 'vitest';
import sampleJson from '../samples/sample-data.json';
import { backupSchema } from './backup';
import { EMPTY_RESUME_CONTENT, resumeContentSchema, resumePutSchema, type ResumeContent } from './resume';
import { formatDuration, formatPeriod, periodMonths, resumeBlocks, resumeToMarkdown, resumeToPlainText } from './resumeFormat';

const resume: ResumeContent = resumeContentSchema.parse({
  fullName: '助部 大介',
  summary: '要約1行目\n要約2行目',
  careers: [
    {
      companyName: '株式会社おでんシステムズ',
      period: { from: '2020-04', to: '2023-09' },
      employees: '約300名',
      employmentType: '正社員',
      projects: [
        {
          name: '案件A',
          period: { from: '2020-07', to: '2021-09' },
          overview: '概要A',
          responsibilities: '設計\n実装',
          environment: 'Java',
          team: '',
          interviewNotes: { hardships: 'SECRET-HARDSHIP' },
        },
      ],
    },
    { companyName: 'すき焼きソフトウェア株式会社', period: { from: '2023-10' }, projects: [] },
  ],
  skills: 'スキル',
  selfPr: '',
  interviewNotes: { strengths: 'SECRET-STRENGTH', weaknesses: 'SECRET-WEAK', reasonForChange: 'SECRET-REASON' },
});

describe('schema', () => {
  test('defaults', () => {
    expect(EMPTY_RESUME_CONTENT).toEqual({
      fullName: '',
      summary: '',
      careers: [],
      skills: '',
      selfPr: '',
      interviewNotes: { strengths: '', weaknesses: '', reasonForChange: '' },
    });
  });

  test.each([
    [{ careers: [{ companyName: '', period: { from: '2020-04' } }] }, 'empty company name'],
    [{ careers: [{ companyName: 'A', period: { from: '2020-13' } }] }, 'invalid month'],
    [{ careers: [{ companyName: 'A', period: { from: '2021-04', to: '2020-03' } }] }, 'end before start'],
  ] as [unknown, string][])('rejects %j (%s)', (input) => {
    expect(resumeContentSchema.safeParse(input).success).toBe(false);
  });

  test('put requires version', () => {
    expect(resumePutSchema.safeParse({}).success).toBe(false);
    expect(resumePutSchema.safeParse({ version: 0 }).success).toBe(true);
  });
});

describe('periods', () => {
  test('format and duration', () => {
    expect(formatPeriod({ from: '2020-04', to: '2021-03' })).toBe('2020年4月～2021年3月');
    expect(formatPeriod({ from: '2023-10' })).toBe('2023年10月～現在');
    expect(formatPeriod({ from: '2020-04', to: '2023-09' }, { currentYearMonth: '2026-11' })).toBe('2020年4月～2023年9月（3年6か月）');
    expect(formatPeriod({ from: '2023-10' }, { currentYearMonth: '2026-11' })).toBe('2023年10月～現在（3年2か月）');
    expect(periodMonths({ from: '2020-04', to: '2020-04' }, '2026-11')).toBe(1);
    expect(formatDuration(8)).toBe('8か月');
    expect(formatDuration(24)).toBe('2年');
  });
});

describe('outputs', () => {
  const today = '2026-11-08';

  test('plain text', () => {
    const text = resumeToPlainText(resume, today);
    expect(text).toContain('職務経歴書\n2026年11月8日現在\n氏名 助部 大介');
    expect(text).toContain('■職務要約\n要約1行目\n要約2行目');
    expect(text).toContain('◆株式会社おでんシステムズ（2020年4月～2023年9月（3年6か月））\n従業員数: 約300名 / 雇用形態: 正社員');
    expect(text).toContain('【案件A】2020年7月～2021年9月（1年3か月）\n＜プロジェクト概要＞\n概要A\n＜担当業務＞\n設計\n実装\n＜言語・環境＞\nJava');
    expect(text).toContain('◆すき焼きソフトウェア株式会社（2023年10月～現在（3年2か月））');
    expect(text).not.toContain('チーム構成'); // empty field omitted
    expect(text).not.toContain('自己PR'); // empty section omitted
  });

  test('markdown', () => {
    const md = resumeToMarkdown(resume, today);
    expect(md.startsWith('# 職務経歴書\n\n2026年11月8日現在  \n氏名 助部 大介  \n')).toBe(true);
    expect(md).toContain('## 職務経歴');
    expect(md).toContain('### 株式会社おでんシステムズ（2020年4月～2023年9月（3年6か月））');
    expect(md).toContain('#### 案件A\n\n期間: 2020年7月～2021年9月（1年3か月）');
    expect(md).toContain('**担当業務**  \n設計  \n実装');
    expect(md).not.toMatch(/\n{3,}/);
  });

  test('interview notes are never output', () => {
    const outputs = [resumeToPlainText(resume, today), resumeToMarkdown(resume, today), JSON.stringify(resumeBlocks(resume, today))];
    for (const out of outputs) expect(out).not.toMatch(/SECRET-/);
  });
});

test('sample resume is valid and outputs cleanly', () => {
  const sample = backupSchema.parse(sampleJson);
  expect(sample.resume?.fullName).toBe('助部 大介');
  expect(sample.resume?.careers.map((c) => c.companyName)).toEqual(['株式会社おでんシステムズ', 'すき焼きソフトウェア株式会社']);
  expect(sample.resume?.careers.flatMap((c) => c.projects)).toHaveLength(5);
  const text = resumeToPlainText(sample.resume!, '2026-11-08');
  for (const note of [sample.resume!.interviewNotes.strengths, sample.resume!.careers[0].projects[0].interviewNotes.hardships]) {
    expect(text).not.toContain(note.split('\n')[0]);
  }
});
