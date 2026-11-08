import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from './csv';
import {
  ACTION_STATUSES,
  SELECTION_PHASES,
  autoMapEnum,
  companiesToCsvRows,
  convertRow,
  distinctValues,
  guessEnumValue,
  guessMapping,
  parseDateTime,
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
  assert.deepEqual(rows, [['a', 'b'], ['x "q"', 'line1\nline2']]);
});

test('toCsv round-trips through parseCsv', () => {
  const data = [['h1', 'h2'], ['a,b', 'say "hi"\nnext'], ['', 'plain']];
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
  const header = companiesToCsvRows([])[0];
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
    agent: { MA: '○○エージェント' },
  };
  const defaults = { phase: '書類選考', action: '要対応' } as const;

  const r1 = convertRow(data[0], 1, mapping, values, defaults);
  assert.deepEqual(r1.errors, []);
  assert.equal(r1.input.companyName, '株式会社S');
  assert.equal(r1.input.agent, '○○エージェント');
  assert.equal(r1.input.agentJobUrl, 'https://agent-ma.example.com/jobs/1001');
  assert.equal(r1.input.nextActionAt, '2026-11-09T15:00');
  assert.equal(r1.input.phase, '一次面接');
  assert.equal(r1.input.action, '要本番準備');

  const r2 = convertRow(data[1], 2, mapping, values, defaults);
  assert.equal(r2.input.agent, 'SA'); // unmapped agent keeps raw label

  const r3 = convertRow(data[2], 3, mapping, values, defaults);
  assert.deepEqual(r3.errors, []);
  assert.equal(r3.input.phase, 'オファー/内定');
  assert.equal(r3.input.nextActionAt, undefined);
});

test('convertRow reports unmapped enum values and empty company name', () => {
  const mapping = guessMapping(['会社名', '選考フェーズ']);
  const r = convertRow(['', '謎'], 1, mapping, { phase: {}, action: {}, agent: {} }, { phase: '書類選考', action: '要対応' });
  assert.equal(r.errors.length, 2);
});
