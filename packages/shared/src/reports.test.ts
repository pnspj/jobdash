import { describe, expect, test } from 'vitest';
import type { Company } from './company';
import type { ActionStatus, SelectionPhase } from './enums';
import {
  companyLabel,
  interviewScheduleText,
  motivationText,
  selectionStatusText,
  unratedForMotivation,
} from './reports';
import { EMPTY_RESEARCH, type Research } from './research';

function make(
  companyName: string,
  phase: SelectionPhase,
  action: ActionStatus,
  research: Partial<Research> = {},
  extra: Partial<Company> = {},
): Company {
  return {
    id: companyName,
    companyName,
    phase,
    action,
    details: '',
    research: { ...EMPTY_RESEARCH, ...research },
    version: 1,
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

test('companyLabel', () => {
  expect(companyLabel(make('A社', '一次面接', '要対応', { tags: ['SI', 'SES'], interviewCount: 2 }))).toBe(
    'A社（SI）面接2回',
  );
  expect(companyLabel(make('B社', '一次面接', '要対応'))).toBe('B社');
  expect(
    companyLabel(make('C社', '一次面接', '要対応', { tags: ['SES'], interviewCount: 1 }), {
      interviewCount: false,
    }),
  ).toBe('C社（SES）');
});

test('interviewScheduleText: upcoming interviews of open companies, soonest first', () => {
  const companies = [
    make(
      'B社',
      '一次面接',
      '要本番準備',
      { tags: ['SES'], interviewCount: 1 },
      {
        interviews: [{ stage: '一次面接', start: '2026-11-05T17:00', end: '2026-11-05T18:00' }],
      },
    ),
    make(
      'A社',
      '二次面接',
      '要本番準備',
      { tags: ['SI'], interviewCount: 2 },
      {
        interviews: [
          { stage: '一次面接', start: '2026-10-20T10:00', end: '2026-10-20T11:00' }, // past
          { stage: '二次面接', start: '2026-11-04T16:00', end: '2026-11-04T17:00' },
        ],
      },
    ),
    make(
      'X社',
      '一次面接',
      '辞退',
      {},
      { interviews: [{ stage: '一次面接', start: '2026-11-06T10:00', end: '2026-11-06T11:00' }] },
    ),
  ];
  expect(interviewScheduleText(companies, '2026-11-04')).toBe(
    '11/4（水）16:00 A社（SI）面接2回\n11/5（木）17:00 B社（SES）面接1回',
  );
  expect(interviewScheduleText(companies, '2026-11-06')).toBe('');
});

describe('selectionStatusText', () => {
  // The example from the requirements
  const companies = [
    make('C社', 'オファー/内定', '要対応', { tags: ['受託開発'], interviewCount: 1 }),
    make(
      'E社',
      '二次面接',
      '日程調整待ち',
      { tags: ['自社サービス'], interviewCount: 3 },
      { nextActionAt: '2026-11-01' },
    ),
    make('A社', '二次面接', '要本番準備', { tags: ['SES'], interviewCount: 2 }, { nextActionAt: '2026-11-02' }),
    make('H社', '一次面接', '選考結果待ち', { tags: ['SES'], interviewCount: 2 }),
    make('S社', '一次面接', '要本番準備', { tags: ['自社サービス'] }, { nextActionAt: '2026-11-03' }),
    make('F社', '一次面接', '要日程調整', { tags: ['自社サービス'] }, { nextActionAt: '2026-11-04' }),
    make('B社', '一次面接', '日程調整待ち', { tags: ['受託開発'] }, { nextActionAt: '2026-11-05' }),
    make('R1社', '一次面接', '不通過'),
    make('R2社', '一次面接', '不通過'),
    make('D社', '書類選考', '選考結果待ち'),
    make('W社', '二次面接', '辞退'),
  ];

  test('matches the requirement example', () => {
    expect(selectionStatusText(companies)).toBe(
      [
        '◇内定',
        'C社（受託開発）面接1回',
        '',
        '◇二次面接待ち',
        'E社（自社サービス）面接3回',
        'A社（SES）面接2回',
        '',
        '◇一次面接結果待ち',
        'H社（SES）面接2回',
        '',
        '◇一次面接待ち',
        'S社（自社サービス）',
        'F社（自社サービス）',
        'B社（受託開発）',
        '',
        '◇一次面接不採用 2社',
      ].join('\n'),
    );
  });

  test('declined companies are counted only when requested', () => {
    expect(selectionStatusText(companies, { includeDeclined: true }).endsWith('◇一次面接不採用 2社\n\n◇辞退 1社')).toBe(
      true,
    );
  });

  test('rejected headings: later phases first, after all open headings', () => {
    const text = selectionStatusText([
      make('X', '一次面接', '不通過'),
      make('Y', '最終面接', '不通過'),
      make('Z', '試験/課題', '選考結果待ち'),
    ]);
    expect(text).toBe('◇試験/課題結果待ち\nZ\n\n◇最終面接不採用 1社\n\n◇一次面接不採用 1社');
  });
});

describe('motivationText', () => {
  const companies = [
    make('A社', '二次面接', '要対応', {
      rating: 3,
      attractions: 'サービスが先進的\n技術スタックが自分に合っている',
      concerns: '残業が多そう',
    }),
    make('B社', '一次面接', '要対応', { rating: 2, attractions: '安定してそう', concerns: '面接官が無愛想' }),
    make('C社', '一次面接', '要対応', { rating: 2 }), // no notes: name only
    make('N社', '一次面接', '要対応'), // unrated
    make('D社', '書類選考', '要対応', { rating: 3 }), // excluded
    make('X社', '一次面接', '不通過', { rating: 3 }), // excluded
  ];

  test('matches the requirement example', () => {
    expect(motivationText(companies)).toBe(
      [
        '志望度★★★',
        '◇A社',
        '魅力的な点',
        '・サービスが先進的',
        '・技術スタックが自分に合っている',
        '不安な点',
        '・残業が多そう',
        '',
        '志望度★★',
        '◇B社',
        '魅力的な点',
        '・安定してそう',
        '不安な点',
        '・面接官が無愛想',
        '◇C社',
      ].join('\n'),
    );
  });

  test('unrated companies are reported separately', () => {
    expect(unratedForMotivation(companies).map((c) => c.companyName)).toEqual(['N社']);
  });
});

describe('label options', () => {
  // The examples from the request (2026-11-10 is a Tuesday)
  const gyoza = make(
    '餃子ソリューションズ株式会社',
    '一次面接',
    '要本番準備',
    { tags: ['SES'], interviewCount: 2 },
    {
      interviews: [{ stage: '一次面接', start: '2026-11-10T16:00', end: '2026-11-10T17:00' }],
    },
  );

  test.each([
    [{}, '11/10（火）16:00 餃子ソリューションズ株式会社（SES）面接2回'],
    [{ stage: true }, '11/10（火）16:00 一次面接 餃子ソリューションズ株式会社（SES）面接2回'],
    [{ stage: true, tag: false, interviewCount: false }, '11/10（火）16:00 一次面接 餃子ソリューションズ株式会社'],
    [{ tag: false }, '11/10（火）16:00 餃子ソリューションズ株式会社面接2回'],
  ])('interview schedule %j', (options, expected) => {
    expect(interviewScheduleText([gyoza], '2026-11-10', options)).toBe(expected);
  });

  test('selection status without tag and interview count', () => {
    expect(selectionStatusText([gyoza], { tag: false, interviewCount: false })).toBe(
      '◇一次面接待ち\n餃子ソリューションズ株式会社',
    );
    expect(selectionStatusText([gyoza], { interviewCount: false })).toBe(
      '◇一次面接待ち\n餃子ソリューションズ株式会社（SES）',
    );
  });
});
