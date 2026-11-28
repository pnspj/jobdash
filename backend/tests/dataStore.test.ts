import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { backupSchema, type Company } from '@jobdash/shared';
import { beforeEach, expect, test } from 'vitest';
import { DataFileError, dataDir, dataFile, initDataStore, readData, reloadData } from '../src/store/dataStore';
import { call } from './helpers';

const backupsDir = () => path.join(dataDir(), 'backups');

beforeEach(async () => {
  await rm(dataDir(), { recursive: true, force: true });
  reloadData();
});

test('first start creates an empty data file in the backup format', async () => {
  expect(await initDataStore()).toBe(dataFile());
  const saved = backupSchema.parse(JSON.parse(await readFile(dataFile(), 'utf8')));
  expect(saved).toMatchObject({ companies: [], agents: [], todos: [] });
  expect(saved.resume).toBeUndefined();
});

test('changes are saved to the file and survive a reload', async () => {
  const { body: created } = await call<Company>('POST', '/api/companies', {
    companyName: 'A社',
    phase: '書類選考',
    action: '選考結果待ち',
  });
  const saved = backupSchema.parse(JSON.parse(await readFile(dataFile(), 'utf8')));
  expect(saved.companies).toEqual([created]);
  expect((await readdir(dataDir())).filter((name) => name.endsWith('.tmp'))).toEqual([]);

  reloadData();
  expect((await call<Company>('GET', `/api/companies/${created.id}`)).body).toEqual(created);
});

test('a failed change is not saved', async () => {
  await initDataStore();
  const before = await readFile(dataFile(), 'utf8');
  expect((await call('PATCH', '/api/companies/missing', { version: 1, memo: 'x' })).status).toBe(404);
  expect(await readFile(dataFile(), 'utf8')).toBe(before);
});

test('a broken data file is reported and never overwritten', async () => {
  await mkdir(dataDir(), { recursive: true });
  for (const content of ['{ not json', JSON.stringify({ app: 'jobdash', schemaVersion: 3, companies: 'x' })]) {
    await writeFile(dataFile(), content);
    reloadData();
    await expect(initDataStore()).rejects.toThrow(DataFileError);
    await expect(readData()).rejects.toThrow(dataFile());
    expect((await call('POST', '/api/agents', { name: 'エージェント', shortName: 'MA' })).status).toBe(500);
    expect(await readFile(dataFile(), 'utf8')).toBe(content);
  }
});

test('startup takes a daily snapshot and keeps the newest ten', async () => {
  await initDataStore(); // creates the file; nothing to snapshot yet
  await expect(readdir(backupsDir())).rejects.toThrow();

  await mkdir(backupsDir());
  const old = Array.from({ length: 12 }, (_, i) => `jobdash-2020-01-${String(i + 1).padStart(2, '0')}.json`);
  for (const name of [...old, 'keep-me.json']) await writeFile(path.join(backupsDir(), name), '{}');

  reloadData();
  await initDataStore();
  await initDataStore(); // a second start on the same day does not add another one
  const names = (await readdir(backupsDir())).sort();
  expect(names).toHaveLength(11);
  expect(names).toContain('keep-me.json');
  expect(names).not.toContain('jobdash-2020-01-03.json');
  expect(names).toContain('jobdash-2020-01-04.json');
  const today = names.filter((name) => !old.includes(name) && name !== 'keep-me.json');
  expect(today).toHaveLength(1);
  expect(await readFile(path.join(backupsDir(), today[0]), 'utf8')).toBe(await readFile(dataFile(), 'utf8'));
});
