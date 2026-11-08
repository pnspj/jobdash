import assert from 'node:assert/strict';
import { expect, test } from 'vitest';
import { parseCsv, toCsv } from './csv';
import {
  ACTION_STATUSES,
  autoMapAgents,
  autoMapEnum,
  companiesToCsvRows,
  convertRow,
  distinctValues,
  guessEnumValue,
  guessMapping,
  NO_AGENT,
  parseDateTime,
  SELECTION_PHASES,
} from './csvMapping';

const NOTION_SAMPLE = `\uFEFF会社名,アクション,次回アクション日,選考フェーズ,Agent,URL
株式会社S,要本番準備,"November 9, 2026 15:00 (GMT+9)",一次面接,MA,https://agent-ma.example.com/jobs/1001
株式会社E,要本番準備,"November 11, 2026 13:00 (GMT+9)",二次面接,SA,https://agent-sa.example.com/jobs/detail?id=2002&category=1
C株式会社,要対応,,オファー / 内定,MA,https://agent-ma.example.com/jobs/1004
`;

test('parseCsv handles BOM, quotes, commas and trailing newline', () => {
  const rows = parseCsv(NOTION_SAMPLE);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], ['会社名', 'アクション', '次回アクション日', '選考フェーズ', 'Agent', 'URL']);
  assert.equal(rows[1][2], 'November 9, 2026 15:00 (GMT+9)');
  assert.equal(rows[3][2], '');
});

test('parseCsv handles escaped quotes and embedded newlines, CRLF', () => {
  const rows = parseCsv('a,b\r\n"x ""q""","line1\nline2"\r\n\r\n');
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['x "q"', 'line1\nline2'],
  ]);
});

test('toCsv round-trips through parseCsv', () => {
  const data = [
    ['h1', 'h2'],
    ['a,b', 'say "hi"\nnext'],
    ['', 'plain'],
  ];
  assert.deepEqual(parseCsv(toCsv(data)), data);
});

test('guessMapping maps the Notion export headers', () => {
  const m = guessMapping(['会社名', 'アクション', '次回アクション日', '選考フェーズ', 'Agent', 'URL']);
  assert.equal(m.companyName, 0);
  assert.equal(m.action, 1);
  assert.equal(m.nextActionDate, 2);
  assert.equal(m.phase, 3);
  assert.equal(m.agent, 4);
  assert.equal(m.agentJobUrl, 5);
  assert.equal(m.companyUrl, null);
  assert.equal(m.details, null);
});

test('guessMapping recognizes JobDash export headers (round trip)', () => {
  const header = companiesToCsvRows([], () => '')[0];
  const m = guessMapping(header);
  assert.equal(m.companyUrl, 1);
  assert.equal(m.agentJobUrl, 3);
  assert.equal(m.nextActionTime, 7);
  assert.equal(m.details, 8);
});

test('parseDateTime formats', () => {
  assert.deepEqual(parseDateTime('November 9, 2026 15:00 (GMT+9)'), { date: '2026-11-09', time: '15:00' });
  assert.deepEqual(parseDateTime('November 9, 2026'), { date: '2026-11-09' });
  assert.deepEqual(parseDateTime('Nov 9, 2026 3:05 PM'), { date: '2026-11-09', time: '15:05' });
  assert.deepEqual(parseDateTime('November 9, 2026 15:00 → 16:00'), { date: '2026-11-09', time: '15:00' });
  assert.deepEqual(parseDateTime('2026/11/9'), { date: '2026-11-09' });
  assert.deepEqual(parseDateTime('2026-11-09T09:30'), { date: '2026-11-09', time: '09:30' });
  assert.deepEqual(parseDateTime('2026年11月9日 15:00'), { date: '2026-11-09', time: '15:00' });
  assert.equal(parseDateTime('  '), null);
  assert.ok(parseDateTime('2026-02-30') && 'error' in parseDateTime('2026-02-30')!);
  assert.ok('error' in parseDateTime('来週')!);
});

test('guessEnumValue normalizes spacing and width', () => {
  assert.equal(guessEnumValue('オファー / 内定', SELECTION_PHASES), 'オファー/内定');
  assert.equal(guessEnumValue('一次面接', SELECTION_PHASES), '一次面接');
  assert.equal(guessEnumValue('内定', SELECTION_PHASES), 'オファー/内定');
  assert.equal(guessEnumValue('面接', SELECTION_PHASES), null); // ambiguous
  assert.equal(guessEnumValue('辞退', ACTION_STATUSES), '辞退');
  assert.equal(guessEnumValue('辞退/不通過', ACTION_STATUSES), null); // ambiguous: user must choose
});

test('convertRow converts a Notion row end to end', () => {
  const rows = parseCsv(NOTION_SAMPLE);
  const [header, ...data] = rows;
  const mapping = guessMapping(header);
  const values = {
    phase: autoMapEnum(distinctValues(data, mapping.phase), SELECTION_PHASES),
    action: autoMapEnum(distinctValues(data, mapping.action), ACTION_STATUSES),
    agent: autoMapAgents(distinctValues(data, mapping.agent), [
      { id: 'agent-ma', name: '○○エージェント', shortName: 'ma' },
    ]),
  };
  const defaults = { phase: '書類選考', action: '要対応' } as const;

  const r1 = convertRow(data[0], 1, mapping, values, defaults);
  assert.deepEqual(r1.errors, []);
  assert.equal(r1.input.companyName, '株式会社S');
  assert.equal(r1.input.agentId, 'agent-ma'); // matched case-insensitively
  assert.equal(r1.input.agentShortName, undefined);
  assert.equal(r1.input.agentJobUrl, 'https://agent-ma.example.com/jobs/1001');
  assert.equal(r1.input.nextActionAt, '2026-11-09T15:00');
  assert.equal(r1.input.phase, '一次面接');
  assert.equal(r1.input.action, '要本番準備');

  const r2 = convertRow(data[1], 2, mapping, values, defaults);
  assert.equal(r2.input.agentShortName, 'SA'); // unknown agent -> created on import
  assert.equal(r2.input.agentId, undefined);

  const none = convertRow(data[1], 2, mapping, { ...values, agent: { SA: NO_AGENT } }, defaults);
  assert.equal(none.input.agentId ?? none.input.agentShortName, undefined);

  const r3 = convertRow(data[2], 3, mapping, values, defaults);
  assert.deepEqual(r3.errors, []);
  assert.equal(r3.input.phase, 'オファー/内定');
  assert.equal(r3.input.nextActionAt, undefined);
});

test('convertRow reports unmapped enum values and empty company name', () => {
  const mapping = guessMapping(['会社名', '選考フェーズ']);
  const r = convertRow(
    ['', '謎'],
    1,
    mapping,
    { phase: {}, action: {}, agent: {} },
    { phase: '書類選考', action: '要対応' },
  );
  assert.equal(r.errors.length, 2);
});

test('autoMapAgents prefers short name, then name, else new; overrides win', () => {
  const agents = [
    { id: 'a1', name: '○○エージェント', shortName: 'MA' },
    { id: 'a2', name: '××エージェント', shortName: 'BA' },
  ];
  assert.deepEqual(autoMapAgents(['ｍａ', '××エージェント', 'XA', 'SA'], agents, { SA: NO_AGENT }), {
    ｍａ: 'a1',
    '××エージェント': 'a2',
    XA: '__new__',
    SA: NO_AGENT,
  });
});

test('research columns are imported (tags split, rating stars, interview count)', () => {
  const [header, ...data] = parseCsv(
    '会社名,選考フェーズ,アクション,タグ,志望度,面接回数,魅力的な点\n' +
      'A社,一次面接,要対応,"自社サービス, SaaS",★★,3回,"サービスが先進的\n技術が合う"\n' +
      'B社,一次面接,要対応,,5,x,\n',
  );
  const mapping = guessMapping(header);
  assert.equal(mapping.tags, 3);
  assert.equal(mapping.rating, 4);
  assert.equal(mapping.interviewCount, 5);
  assert.equal(mapping.attractions, 6);
  const values = {
    phase: autoMapEnum(distinctValues(data, mapping.phase), SELECTION_PHASES),
    action: autoMapEnum(distinctValues(data, mapping.action), ACTION_STATUSES),
    agent: {},
  };
  const defaults = { phase: '書類選考', action: '要対応' } as const;

  const a = convertRow(data[0], 1, mapping, values, defaults);
  assert.deepEqual(a.errors, []);
  assert.deepEqual(a.input.research?.tags, ['自社サービス', 'SaaS']);
  assert.equal(a.input.research?.rating, 2);
  assert.equal(a.input.research?.interviewCount, 3);
  assert.equal(a.input.research?.attractions, 'サービスが先進的\n技術が合う');

  const b = convertRow(data[1], 2, mapping, values, defaults);
  assert.equal(b.errors.length, 2); // invalid rating and interview count
});

test('rows have no research when no research column is mapped', () => {
  const mapping = guessMapping(['会社名']);
  const r = convertRow(
    ['A社'],
    1,
    mapping,
    { phase: {}, action: {}, agent: {} },
    { phase: '書類選考', action: '要対応' },
  );
  assert.equal(r.input.research, undefined);
});

test('export writes research columns that import reads back', () => {
  const company = {
    id: 'c1',
    companyName: 'A社',
    phase: '一次面接',
    action: '要対応',
    details: '',
    research: {
      motivation: '理由',
      futureVision: '',
      reverseQuestions: '',
      attractions: '良い',
      concerns: '',
      tags: ['SI', '受託開発'],
      interviewCount: 2,
      rating: 3,
    },
    version: 1,
    createdAt: '',
    updatedAt: '2026-11-08T00:00:00.000Z',
  } as const;
  const rows = parseCsv(
    toCsv(
      companiesToCsvRows(
        [{ ...company, research: { ...company.research, tags: [...company.research.tags] } }],
        () => '',
      ),
    ),
  );
  const mapping = guessMapping(rows[0]);
  const r = convertRow(
    rows[1],
    1,
    mapping,
    { phase: { 一次面接: '一次面接' }, action: { 要対応: '要対応' }, agent: {} },
    { phase: '書類選考', action: '要対応' },
  );
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.input.research, { ...company.research, tags: ['SI', '受託開発'] });
});

test('CSV injection: formula-like cells are escaped on export and restored on import', async () => {
  const { escapeFormula, unescapeFormula } = await import('./csv');
  expect(escapeFormula('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
  expect(escapeFormula('-残業')).toBe("'-残業");
  expect(escapeFormula('A社')).toBe('A社');
  expect(unescapeFormula("'=1+1")).toBe('=1+1');
  expect(unescapeFormula("'quoted")).toBe("'quoted"); // only apostrophes added by escapeFormula are removed

  const csv = toCsv([
    ['会社名', '詳細'],
    ['=cmd|calc', '+memo'],
  ]);
  expect(csv).toContain(`'=cmd|calc`);
  const [header, ...data] = parseCsv(csv);
  const r = convertRow(
    data[0],
    1,
    guessMapping(header),
    { phase: {}, action: {}, agent: {} },
    { phase: '書類選考', action: '要対応' },
  );
  expect(r.input.companyName).toBe('=cmd|calc');
  expect(r.input.details).toBe('+memo');
});

test('non-http URLs in CSV are reported as row errors', () => {
  const [header, ...data] = parseCsv(
    '会社名,会社URL,URL\nA社,javascript:alert(1),https://agent-ma.example.com/jobs/1\n',
  );
  const r = convertRow(
    data[0],
    1,
    guessMapping(header),
    { phase: {}, action: {}, agent: {} },
    { phase: '書類選考', action: '要対応' },
  );
  expect(r.errors).toHaveLength(1);
  expect(r.errors[0]).toMatch(/会社URL/);
});
