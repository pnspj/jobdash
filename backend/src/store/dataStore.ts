import { constants } from 'node:fs';
import { copyFile, mkdir, open, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Agent, backupSchema, type Company, type Resume, SCHEMA_VERSION, type Todo } from '@jobdash/shared';
import { z } from 'zod';

/**
 * All data lives in one JSON file in the backup format (see backupSchema).
 * The file is loaded once and kept in memory; every change rewrites the whole file atomically.
 * Editing the file while the API is running is not supported: the next save overwrites it.
 */
export interface Data {
  companies: Company[];
  agents: Agent[];
  todos: Todo[];
  /** Absent until the resume is saved for the first time. */
  resume?: Resume;
}

/** The data file is missing required fields, is not JSON, ... Never overwritten automatically. */
export class DataFileError extends Error {}

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DATA_FILE_NAME = 'jobdash.json';
/** Number of daily snapshots kept in `<data dir>/backups`. */
const SNAPSHOTS_KEPT = 10;

/** `JOBDASH_DATA_DIR` (relative paths are resolved against the repository root), default `<repo>/data`. */
export const dataDir = () => path.resolve(REPO_ROOT, process.env.JOBDASH_DATA_DIR ?? 'data');
export const dataFile = () => path.join(dataDir(), DATA_FILE_NAME);

export const emptyData = (): Data => ({ companies: [], agents: [], todos: [] });

let cache: Promise<Data> | undefined;
/** Writes run one at a time, in call order. */
let queue: Promise<unknown> = Promise.resolve();

async function load(file: string): Promise<Data> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyData();
    throw err;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new DataFileError(`${file} を JSON として読み込めません: ${(err as Error).message}`);
  }
  // Parsing also upgrades data saved by older versions (migrate on read)
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    throw new DataFileError(`${file} の内容が正しくありません:\n${z.prettifyError(parsed.error)}`);
  }
  const { companies, agents, todos = [], resume } = parsed.data;
  return { companies, agents, todos, ...(resume ? { resume } : {}) };
}

/** The file content: the same format as a downloaded backup, so either can replace the other. */
function serialize(data: Data): string {
  const { companies, agents, todos, resume } = data;
  const doc = {
    app: 'jobdash',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    companies,
    agents,
    todos,
    ...(resume ? { resume } : {}),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** Write to a temporary file, flush it to disk, then rename it over the target. */
async function writeFileAtomic(file: string, text: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const handle = await open(tmp, 'w');
  try {
    await handle.writeFile(text, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, file);
}

/** The current data. Callers must not modify it; use updateData. */
export function readData(): Promise<Data> {
  cache ??= load(dataFile());
  return cache;
}

/**
 * Apply `fn` to a copy of the data and save it. If `fn` throws (not found, version conflict, ...),
 * nothing is saved and the error is passed on. Returns what `fn` returns.
 */
export function updateData<T>(fn: (draft: Data) => T): Promise<T> {
  const run = queue.then(async () => {
    const draft = structuredClone(await readData());
    const result = fn(draft);
    await writeFileAtomic(dataFile(), serialize(draft));
    cache = Promise.resolve(draft);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

/** Replace all data (backup restore, delete all). */
export const replaceData = (next: Data) =>
  updateData((draft) => {
    Object.assign(draft, next);
    if (!next.resume) delete draft.resume;
  });

/** Forget the loaded data; the next read loads the file again. */
export function reloadData(): void {
  cache = undefined;
}

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Copy the data file to `backups/jobdash-YYYY-MM-DD.json` once a day and keep the newest snapshots. */
async function snapshot(file: string): Promise<void> {
  const dir = path.join(path.dirname(file), 'backups');
  await mkdir(dir, { recursive: true });
  try {
    await copyFile(file, path.join(dir, `jobdash-${localDate()}.json`), constants.COPYFILE_EXCL);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
  const snapshots = (await readdir(dir)).filter((name) => /^jobdash-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  for (const name of snapshots.slice(0, -SNAPSHOTS_KEPT)) await rm(path.join(dir, name));
}

/**
 * Called at API startup: validate the data file (throws DataFileError when it is broken),
 * take the daily snapshot, or create an empty file on first run. Returns the file path.
 */
export async function initDataStore(): Promise<string> {
  const file = dataFile();
  await readData();
  const exists = await stat(file).then(
    () => true,
    () => false,
  );
  if (exists) await snapshot(file);
  else await replaceData(emptyData());
  return file;
}
