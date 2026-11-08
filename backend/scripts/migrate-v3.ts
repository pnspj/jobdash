/**
 * Migrate from schema v2 to v3: free-text `agent` on companies -> Agent entities + `agentId`.
 *
 *   - creates one Agent per distinct `agent` value (name = short name = the value; rename later in the UI)
 *     unless an agent with that short name already exists
 *   - sets company.agentId and removes company.agent (empty agent -> no agentId)
 *
 * Usage:
 *   npm run migrate:v3 -w backend                 # dry run
 *   npm run migrate:v3 -w backend -- --apply      # writes a JSON backup to ../backups, then migrates
 *
 * Idempotent: companies without an `agent` attribute are left unchanged.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { agentSchema, companySchema, normalizeShortName } from '@jobdash/shared';
import { TABLE_NAME } from '../src/db/client';
import { itemKey, skPrefix } from '../src/db/keys';
import { batchPut, queryByPrefix } from '../src/db/operations';

const apply = process.argv.includes('--apply');

type Item = Record<string, unknown>;

const companies = await queryByPrefix(skPrefix('COMPANY'));
const agents = await queryByPrefix(skPrefix('AGENT'));
console.log(
  `Table ${TABLE_NAME}: ${companies.length} companies, ${agents.length} agents. Mode: ${apply ? 'APPLY' : 'dry run'}`,
);

const agentIdByKey = new Map(agents.map((a) => [normalizeShortName(String(a.shortName)), String(a.id)]));
const newAgents: Item[] = [];
const now = new Date().toISOString();

const agentIdFor = (shortName: string): string => {
  const key = normalizeShortName(shortName);
  let id = agentIdByKey.get(key);
  if (!id) {
    id = randomUUID();
    agentIdByKey.set(key, id);
    const agent = { id, name: shortName, shortName, memo: '', version: 1, createdAt: now, updatedAt: now };
    agentSchema.parse(agent);
    newAgents.push({ ...itemKey('AGENT', id), type: 'AGENT', ...agent });
    console.log(`  + agent "${shortName}"`);
  }
  return id;
};

const updatedCompanies: Item[] = [];
for (const item of companies) {
  if (!('agent' in item)) continue;
  const { agent, ...rest } = item;
  const shortName = String(agent ?? '').trim();
  const next: Item = { ...rest };
  if (shortName) next.agentId = agentIdFor(shortName);

  const { PK: _pk, SK: _sk, type: _type, ...entity } = next;
  const result = companySchema.safeParse(entity);
  if (!result.success)
    throw new Error(`Company ${String(item.SK)} is invalid after migration: ${result.error.message}`);
  updatedCompanies.push(next);
}

console.log(`${newAgents.length} agent(s) to create, ${updatedCompanies.length} company item(s) to update.`);

if (apply && (newAgents.length > 0 || updatedCompanies.length > 0)) {
  mkdirSync(new URL('../../backups/', import.meta.url), { recursive: true });
  const file = new URL(`../../backups/${TABLE_NAME}-before-v3-${Date.now()}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify({ companies, agents }, null, 2));
  console.log(`Backup written: ${file.pathname}`);
  // Agents first so companies never reference a missing agent
  await batchPut(newAgents);
  await batchPut(updatedCompanies);
  console.log('Migration applied.');
}
