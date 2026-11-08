/**
 * Migrate company items from schema v1 to v2.
 *
 *   nextActionDate + nextActionTime  ->  nextActionAt ("YYYY-MM-DD" | "YYYY-MM-DDTHH:mm")
 *   action "辞退/不通過"              ->  "不通過" (or "辞退" with --closed-as=辞退)
 *   adds type / version / createdAt when missing
 *
 * Usage:
 *   npm run migrate:v2                 # dry run: prints the planned changes
 *   npm run migrate:v2 -- --apply      # writes a JSON backup to ../backups, then migrates
 *
 * Idempotent: items already in v2 shape are left unchanged.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { type Company, companySchema } from '@jobdash/shared';
import { TABLE_NAME } from '../src/db/client';
import { skPrefix } from '../src/db/keys';
import { batchPut, queryByPrefix } from '../src/db/operations';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const closedAs = (args.find((a) => a.startsWith('--closed-as='))?.split('=')[1] ?? '不通過') as '辞退' | '不通過';
if (closedAs !== '辞退' && closedAs !== '不通過') throw new Error('--closed-as must be 辞退 or 不通過');

type Item = Record<string, unknown>;

function migrate(item: Item): { next: Item; changes: string[] } {
  const next: Item = { ...item };
  const changes: string[] = [];

  if ('nextActionDate' in next || 'nextActionTime' in next) {
    const date = (next.nextActionDate as string | undefined) ?? '';
    const time = (next.nextActionTime as string | undefined) ?? '';
    delete next.nextActionDate;
    delete next.nextActionTime;
    if (date) next.nextActionAt = time ? `${date}T${time}` : date;
    changes.push(`nextActionAt=${(next.nextActionAt as string | undefined) ?? '(none)'}`);
  }
  if (next.action === '辞退/不通過') {
    next.action = closedAs;
    changes.push(`action=${closedAs}`);
  }
  if (next.type !== 'COMPANY') {
    next.type = 'COMPANY';
    changes.push('type');
  }
  if (typeof next.version !== 'number') {
    next.version = 1;
    changes.push('version');
  }
  if (typeof next.createdAt !== 'string') {
    next.createdAt = next.updatedAt;
    changes.push('createdAt');
  }
  return { next, changes };
}

const items = await queryByPrefix(skPrefix('COMPANY'));
console.log(`Table ${TABLE_NAME}: ${items.length} company items. Mode: ${apply ? 'APPLY' : 'dry run'}`);

const toWrite: Item[] = [];
for (const item of items) {
  const { next, changes } = migrate(item);
  // Validate the result against the v2 schema (minus key attributes)
  const { PK: _pk, SK: _sk, type: _type, ...entity } = next;
  const result = companySchema.safeParse(entity);
  if (!result.success) {
    throw new Error(`Item ${String(item.SK)} is invalid after migration: ${result.error.message}`);
  }
  if (changes.length > 0) {
    toWrite.push(next);
    console.log(`  ${(entity as Company).companyName}: ${changes.join(', ')}`);
  }
}

console.log(`${toWrite.length} item(s) to update.`);

if (apply && toWrite.length > 0) {
  mkdirSync(new URL('../../backups/', import.meta.url), { recursive: true });
  const file = new URL(`../../backups/${TABLE_NAME}-before-v2-${Date.now()}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify(items, null, 2));
  console.log(`Backup written: ${file.pathname}`);
  await batchPut(toWrite);
  console.log('Migration applied.');
}
