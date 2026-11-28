import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

// Never touch the real data file: point the store at a temporary directory for this test file
const dir = mkdtempSync(path.join(os.tmpdir(), 'jobdash-test-'));
process.env.JOBDASH_DATA_DIR = dir;

afterAll(() => rmSync(dir, { recursive: true, force: true }));
