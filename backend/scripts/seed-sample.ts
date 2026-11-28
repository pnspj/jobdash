/**
 * Replace ALL data with the fictional sample (packages/shared/samples/sample-data.json),
 * with dates moved to the current week.
 *
 *   npm run seed:sample -w backend -- --yes
 */
import { sampleBackup } from '@jobdash/shared/sample';
import { backupService } from '../src/services/backupService';
import { dataFile, initDataStore } from '../src/store/dataStore';

if (!process.argv.includes('--yes')) {
  console.error(`This replaces ALL data in ${dataFile()} with the sample. Re-run with --yes to proceed.`);
  process.exit(1);
}

await initDataStore();
const restored = await backupService.restore(sampleBackup());
console.log(`Loaded sample into ${dataFile()}: ${restored.companies} companies, ${restored.agents} agents.`);
