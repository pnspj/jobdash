export async function setup() {
  process.env.TABLE_NAME = 'JobHuntingTable_test';
  const { ensureTable } = await import('../src/db/init-table');
  await ensureTable(3);
}
