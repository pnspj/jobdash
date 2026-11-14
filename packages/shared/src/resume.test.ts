import { describe, expect, test } from 'vitest';
import sampleJson from '../samples/sample-data.json';
import { backupSchema } from './backup';
import {
  EMPTY_RESUME_CONTENT,
  latestCareerIndex,
  type ResumeContent,
  resumeContentSchema,
  resumePutSchema,
  resumeSchema,
} from './resume';
import {
  formatDuration,
  formatPeriod,
  periodMonths,
  resumeBlocks,
  resumeToMarkdown,
  resumeToPlainText,
} from './resumeFormat';

const resume: ResumeContent = resumeContentSchema.parse({
  fullName: '序部 大介',
  summary: '要約1行目\n要約2行目',
  careers: [
    {
      companyName: '株式会社おでんシステムズ',
      period: { from: '2020-04', to: '2023-09' },
      businessDescription: 'SES',
      capital: '1億円（退職時点）',
      employees: '300名',
      employmentType: '正社員',
      department: '開発部',
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
    {
      companyName: 'すき焼きソフトウェア株式会社',
      period: { from: '2023-10' },
      projects: [],
      interviewNotes: { reasonForJoining: 'SECRET-JOINING', reasonForLeaving: 'SECRET-LEAVING' },
    },
  ],
  skills: 'スキル',
  selfPr: '',
  interviewNotes: { strengths: 'SECRET-STRENGTH', weaknesses: 'SECRET-WEAK' },
});

describe('schema', () => {
  test('defaults', () => {
    expect(EMPTY_RESUME_CONTENT).toEqual({
      fullName: '',
      summary: '',
      careers: [],
      skills: '',
      selfPr: '',
      interviewNotes: { strengths: '', weaknesses: '' },
    });
  });

  test('career notes default to empty', () => {
    expect(resume.careers[0].interviewNotes).toEqual({ reasonForJoining: '', reasonForLeaving: '' });
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

describe('legacy reasonForChange', () => {
  const legacy = (careers: unknown[], reasonForChange = '旧転職理由') => ({
    careers,
    interviewNotes: { strengths: '強み', weaknesses: '弱み', reasonForChange },
  });
  const odn = { companyName: 'おでん', period: { from: '2020-04', to: '2023-09' } };
  const suki = { companyName: 'すき焼き', period: { from: '2023-10' } };

  test('moves to the most recent career regardless of order', () => {
    for (const careers of [
      [odn, suki],
      [suki, odn],
    ]) {
      const r = resumeContentSchema.parse(legacy(careers));
      expect(r.interviewNotes).toEqual({ strengths: '強み', weaknesses: '弱み' });
      expect(r.careers.find((c) => c.companyName === 'すき焼き')?.interviewNotes.reasonForLeaving).toBe('旧転職理由');
      expect(r.careers.find((c) => c.companyName === 'おでん')?.interviewNotes.reasonForLeaving).toBe('');
    }
  });

  test('appends to an existing reason', () => {
    const r = resumeContentSchema.parse(
      legacy([{ ...suki, interviewNotes: { reasonForJoining: '入社', reasonForLeaving: '既存' } }]),
    );
    expect(r.careers[0].interviewNotes).toEqual({ reasonForJoining: '入社', reasonForLeaving: '既存\n旧転職理由' });
  });

  test('empty legacy value is dropped', () => {
    expect(resumeContentSchema.parse(legacy([suki], '')).interviewNotes).toEqual({
      strengths: '強み',
      weaknesses: '弱み',
    });
  });

  test('kept when there is no career', () => {
    expect(resumeContentSchema.parse(legacy([])).interviewNotes.reasonForChange).toBe('旧転職理由');
  });

  test('stored resumes and PUT bodies are migrated too', () => {
    const stored = resumeSchema.parse({ ...legacy([odn]), version: 3, updatedAt: '2026-11-01T00:00:00.000Z' });
    expect(stored.careers[0].interviewNotes.reasonForLeaving).toBe('旧転職理由');
    const put = resumePutSchema.parse({ ...legacy([odn]), version: 3 });
    expect(put.careers[0].interviewNotes.reasonForLeaving).toBe('旧転職理由');
  });

  test('latestCareerIndex', () => {
    expect(latestCareerIndex([])).toBe(-1);
    expect(latestCareerIndex([odn, suki])).toBe(1);
    expect(
      latestCareerIndex([
        { period: { from: '2019-04', to: '2023-09' } },
        { period: { from: '2021-04', to: '2023-09' } },
      ]),
    ).toBe(1);
  });
});

describe('periods', () => {
  test('format and duration', () => {
    expect(formatPeriod({ from: '2020-04', to: '2021-03' })).toBe('2020年4月～2021年3月');
    expect(formatPeriod({ from: '2023-10' })).toBe('2023年10月～現在');
    expect(formatPeriod({ from: '2020-04', to: '2023-09' }, { currentYearMonth: '2026-11' })).toBe(
      '2020年4月～2023年9月（3年6か月）',
    );
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
    expect(text).toContain('職務経歴書\n2026年11月8日現在\n氏名 序部 大介');
    expect(text).toContain('■職務要約\n要約1行目\n要約2行目');
    expect(text).toContain(
      '◆株式会社おでんシステムズ（2020年4月～2023年9月（3年6か月））\n事業内容: SES\n資本金: 1億円（退職時点） / 従業員数: 300名\n雇用形態: 正社員 / 所属部署: 開発部',
    );
    expect(text).toContain(
      '【案件A】2020年7月～2021年9月（1年3か月）\n＜プロジェクト概要＞\n概要A\n＜担当業務＞\n設計\n実装\n＜言語・環境＞\nJava',
    );
    expect(text).toContain('◆すき焼きソフトウェア株式会社（2023年10月～現在（3年2か月））');
    expect(text).not.toContain('チーム構成'); // empty field omitted
    expect(text).not.toContain('自己PR'); // empty section omitted
  });

  test('markdown', () => {
    const md = resumeToMarkdown(resume, today);
    expect(md.startsWith('# 職務経歴書\n\n2026年11月8日現在  \n氏名 序部 大介  \n')).toBe(true);
    expect(md).toContain('## 職務経歴');
    expect(md).toContain(
      '### 株式会社おでんシステムズ（2020年4月～2023年9月（3年6か月））\n\n事業内容: SES  \n資本金: 1億円（退職時点） / 従業員数: 300名  \n雇用形態: 正社員 / 所属部署: 開発部\n\n',
    );
    expect(md).toContain('#### 案件A\n\n期間: 2020年7月～2021年9月（1年3か月）');
    expect(md).toContain('**担当業務**  \n設計  \n実装');
    expect(md).not.toMatch(/\n{3,}/);
  });

  test('interview notes are never output', () => {
    const outputs = [
      resumeToPlainText(resume, today),
      resumeToMarkdown(resume, today),
      JSON.stringify(resumeBlocks(resume, today)),
    ];
    for (const out of outputs) expect(out).not.toMatch(/SECRET-/);
  });
});

test('sample resume is valid and outputs cleanly', () => {
  const sample = backupSchema.parse(sampleJson);
  expect(sample.resume?.fullName).toBe('序部 大介');
  // Newest first, both companies and projects
  expect(sample.resume?.careers.map((c) => c.companyName)).toEqual([
    'すき焼きソフトウェア株式会社',
    '株式会社おでんシステムズ',
  ]);
  for (const c of sample.resume!.careers) {
    const starts = c.projects.map((p) => p.period.from);
    expect(starts).toEqual([...starts].sort().reverse());
  }
  expect(sample.resume?.careers.flatMap((c) => c.projects)).toHaveLength(5);
  const text = resumeToPlainText(sample.resume!, '2026-11-08');
  for (const note of [
    sample.resume!.interviewNotes.strengths,
    sample.resume!.careers[0].projects[0].interviewNotes.hardships,
    sample.resume!.careers[0].interviewNotes.reasonForJoining,
    sample.resume!.careers[0].interviewNotes.reasonForLeaving,
  ]) {
    expect(text).not.toContain(note.split('\n')[0]);
  }
});
