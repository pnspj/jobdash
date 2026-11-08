/**
 * Replace ALL data with the fictional sample (packages/shared/samples/sample-data.json),
 * with dates moved to the current week.
 *
 *   npm run seed:sample -w backend -- --yes
 */
import { sampleBackup } from '@jobdash/shared/sample';
import { TABLE_NAME } from '../src/db/client';
import { ensureTable } from '../src/db/init-table';
import { backupService } from '../src/services/backupService';

if (!process.argv.includes('--yes')) {
  console.error(`This replaces ALL data in table "${TABLE_NAME}" with the sample. Re-run with --yes to proceed.`);
  process.exit(1);
}

await ensureTable();
const restored = await backupService.restore(sampleBackup());
console.log(`Loaded sample into ${TABLE_NAME}: ${restored.companies} companies, ${restored.agents} agents.`);
