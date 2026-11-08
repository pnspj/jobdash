import type { Backup, Resume } from '@jobdash/shared';
import { beforeEach, expect, test } from 'vitest';
import { call, clearTable } from './helpers';

beforeEach(clearTable);

const content = {
  fullName: '序部 大介',
  summary: '要約',
  careers: [
    {
      companyName: '株式会社おでんシステムズ',
      period: { from: '2020-04', to: '2023-09' },
      employees: '約300名',
      employmentType: '正社員',
      projects: [{ name: '案件A', period: { from: '2020-07', to: '2021-09' }, interviewNotes: { hardships: 'メモ' } }],
    },
  ],
};

test('empty resume before the first save', async () => {
  const res = await call<Resume>('GET', '/api/resume');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ fullName: '', careers: [], version: 0 });
});

test('save, update with version, and conflicts', async () => {
  const first = await call<Resume>('PUT', '/api/resume', { version: 0, ...content });
  expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ fullName: '序部 大介', version: 1, selfPr: '' });
  expect(first.body.careers[0].projects[0]).toMatchObject({ overview: '', interviewNotes: { hardships: 'メモ' } });

  // A second "first save" from another tab is a conflict
  expect((await call('PUT', '/api/resume', { version: 0, ...content })).status).toBe(409);

  const second = await call<Resume>('PUT', '/api/resume', { version: 1, ...content, selfPr: 'PR' });
  expect(second.body).toMatchObject({ selfPr: 'PR', version: 2 });
  expect((await call('PUT', '/api/resume', { version: 1, ...content })).status).toBe(409);
  expect((await call<Resume>('GET', '/api/resume')).body).toEqual(second.body);
});

test('validation', async () => {
  const bad = { version: 0, careers: [{ companyName: '', period: { from: '2020-04', to: '2019-01' } }] };
  const res = await call<{ errors: string[] }>('PUT', '/api/resume', bad);
  expect(res.status).toBe(400);
  expect(res.body.errors.join()).toMatch(/companyName/);
  expect(res.body.errors.join()).toMatch(/period\.to/);
});

test('resume is included in backups and removed by delete-all', async () => {
  expect((await call<Backup>('GET', '/api/backup')).body.resume).toBeUndefined(); // nothing saved yet
  await call('PUT', '/api/resume', { version: 0, ...content });
  const { body: backup } = await call<Backup>('GET', '/api/backup');
  expect(backup.resume?.fullName).toBe('序部 大介');

  const deleted = await call<{ deleted: Record<string, number> }>('DELETE', '/api/data?confirm=DELETE_ALL');
  expect(deleted.body.deleted.resume).toBe(1);
  expect((await call<Resume>('GET', '/api/resume')).body.version).toBe(0);

  await call('POST', '/api/backup/restore', backup);
  expect((await call<Resume>('GET', '/api/resume')).body.fullName).toBe('序部 大介');
});
