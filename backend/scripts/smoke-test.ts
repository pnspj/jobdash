// End-to-end smoke test for the CRUD API. Usage: npm run smoke (API must be running)
const BASE = `${process.env.API_BASE_URL ?? 'http://localhost:8787'}/api/companies`;

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  if (!cond) failures++;
}

const json = (body: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const valid = {
  companyName: 'スモークテスト株式会社',
  companyUrl: 'https://example.com',
  agent: '山田',
  agentJobUrl: '',
  phase: '書類選考',
  action: '選考結果待ち',
  nextActionDate: '2026-11-10',
  nextActionTime: '15:00',
  details: 'メモ\n2行目',
};

// POST
let res = await fetch(BASE, { method: 'POST', ...json(valid) });
const created = await res.json();
check('POST returns 201', res.status === 201, res.status);
check('POST assigns uuid id', /^[0-9a-f-]{36}$/.test(created.id), created.id);
check('POST sets updatedAt', !Number.isNaN(Date.parse(created.updatedAt)), created.updatedAt);
check('POST keeps nextActionTime', created.nextActionTime === '15:00', created);
check('POST drops empty optional URL', !('agentJobUrl' in created), created);
const id: string = created.id;

// GET list
res = await fetch(BASE);
const list = await res.json();
check('GET list returns 200 array', res.status === 200 && Array.isArray(list), res.status);
check('GET list contains created item', list.some((c: { id: string }) => c.id === id));
check('GET list strips PK/SK', list.every((c: object) => !('PK' in c) && !('SK' in c)));

// GET one
res = await fetch(`${BASE}/${id}`);
const one = await res.json();
check('GET one returns 200', res.status === 200, res.status);
check('GET one preserves multiline details', one.details === valid.details, one.details);

// PUT
res = await fetch(`${BASE}/${id}`, {
  method: 'PUT',
  ...json({ ...valid, phase: '一次面接', action: '要日程調整', nextActionDate: '', companyUrl: '' }),
});
const updated = await res.json();
check('PUT returns 200', res.status === 200, res.status);
check('PUT updates phase/action', updated.phase === '一次面接' && updated.action === '要日程調整', updated);
check('PUT advances updatedAt', updated.updatedAt >= created.updatedAt);
res = await fetch(`${BASE}/${id}`);
const reread = await res.json();
check('PUT persisted and removed cleared URL', reread.phase === '一次面接' && !('companyUrl' in reread), reread);
check('PUT drops time when date is cleared', !('nextActionTime' in reread), reread);

// Validation / not found
res = await fetch(BASE, { method: 'POST', ...json({ companyName: '', phase: 'x' }) });
check('POST invalid returns 400', res.status === 400, res.status);
res = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
check('POST malformed JSON returns 400', res.status === 400, res.status);
res = await fetch(BASE, { method: 'POST', ...json({ ...valid, nextActionTime: '25:00' }) });
check('POST invalid time returns 400', res.status === 400, res.status);
res = await fetch(`${BASE}/does-not-exist`, { method: 'PUT', ...json(valid) });
check('PUT missing returns 404', res.status === 404, res.status);

// Bulk import (60 rows spans multiple BatchWrite chunks)
const importRecords = Array.from({ length: 60 }, (_, i) => ({ ...valid, companyName: `インポート${i}` }));
res = await fetch(`${BASE}/import`, { method: 'POST', ...json({ records: importRecords }) });
const imported = await res.json();
check('IMPORT returns 201 with count', res.status === 201 && imported.imported === 60, imported);
const afterImport: { id: string; companyName: string }[] = await (await fetch(BASE)).json();
const importedItems = afterImport.filter((c) => c.companyName.startsWith('インポート'));
check('IMPORT persisted all rows', importedItems.length === 60, importedItems.length);
res = await fetch(`${BASE}/import`, { method: 'POST', ...json({ records: [valid, { ...valid, phase: 'x' }] }) });
const rejected = await res.json();
check('IMPORT rejects batch with invalid row', res.status === 400 && rejected.rowErrors?.[0]?.index === 1, rejected);
res = await fetch(`${BASE}/import`, { method: 'POST', ...json({ records: [] }) });
check('IMPORT rejects empty records', res.status === 400, res.status);
for (const c of importedItems) await fetch(`${BASE}/${c.id}`, { method: 'DELETE' });
const leftover = ((await (await fetch(BASE)).json()) as { companyName: string }[]).filter((c) => c.companyName.startsWith('インポート'));
check('IMPORT cleanup', leftover.length === 0, leftover.length);

// CORS
res = await fetch(BASE, { headers: { Origin: 'http://localhost:3000' } });
check('CORS allows frontend origin', res.headers.get('access-control-allow-origin') === 'http://localhost:3000');

// DELETE
res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
check('DELETE returns 204', res.status === 204, res.status);
res = await fetch(`${BASE}/${id}`);
check('GET after delete returns 404', res.status === 404, res.status);
res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
check('DELETE missing returns 404', res.status === 404, res.status);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
