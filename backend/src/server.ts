import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { randomUUID } from 'node:crypto';
import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { COMPANY_SK_PREFIX, docClient, TABLE_NAME, USER_PK } from './db.js';
import { ensureTable } from './init-table.js';
import {
  ACTION_STATUSES,
  IMPORT_MAX_RECORDS,
  SELECTION_PHASES,
  type CompanyInput,
  type CompanyRecord,
} from './types.js';

const PORT = Number(process.env.PORT ?? 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

// ---------- helpers ----------

type DbItem = CompanyRecord & { PK: string; SK: string };

const toKey = (id: string) => ({ PK: USER_PK, SK: `${COMPANY_SK_PREFIX}${id}` });

const toRecord = (item: Record<string, unknown>): CompanyRecord => {
  const { PK: _pk, SK: _sk, ...rest } = item as unknown as DbItem;
  return rest;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/** Validate request body. Returns the normalized input or a list of errors. */
function validateInput(body: unknown): { ok: true; value: CompanyInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.companyName !== 'string' || b.companyName.trim() === '') errors.push('companyName is required');
  if (typeof b.agent !== 'string') errors.push('agent must be a string');
  if (!SELECTION_PHASES.includes(b.phase as never)) errors.push(`phase must be one of: ${SELECTION_PHASES.join(', ')}`);
  if (!ACTION_STATUSES.includes(b.action as never)) errors.push(`action must be one of: ${ACTION_STATUSES.join(', ')}`);
  if (typeof b.nextActionDate !== 'string' || (b.nextActionDate !== '' && !DATE_RE.test(b.nextActionDate))) {
    errors.push('nextActionDate must be YYYY-MM-DD (or empty string)');
  }
  if (b.nextActionTime !== undefined && (typeof b.nextActionTime !== 'string' || (b.nextActionTime !== '' && !TIME_RE.test(b.nextActionTime)))) {
    errors.push('nextActionTime must be HH:mm (or empty string)');
  }
  if (b.details !== undefined && typeof b.details !== 'string') errors.push('details must be a string');

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      companyName: (b.companyName as string).trim(),
      companyUrl: optionalString(b.companyUrl),
      agent: (b.agent as string).trim(),
      agentJobUrl: optionalString(b.agentJobUrl),
      phase: b.phase as CompanyInput['phase'],
      action: b.action as CompanyInput['action'],
      nextActionDate: b.nextActionDate as string,
      // A time is meaningless without a date
      nextActionTime: b.nextActionDate ? optionalString(b.nextActionTime) : undefined,
      details: (b.details as string | undefined) ?? '',
    },
  };
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// ---------- app ----------

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({ origin: FRONTEND_ORIGIN }));

app.get('/health', (c) => c.json({ status: 'ok' }));

// GET /api/companies : list all companies
app.get('/api/companies', async (c) => {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': USER_PK, ':sk': COMPANY_SK_PREFIX },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return c.json(items.map(toRecord));
});

// GET /api/companies/:id : get one company
app.get('/api/companies/:id', async (c) => {
  const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: toKey(c.req.param('id')) }));
  if (!res.Item) return c.json({ message: 'Company not found' }, 404);
  return c.json(toRecord(res.Item));
});

// POST /api/companies : create a company
app.post('/api/companies', async (c) => {
  const result = validateInput(await readJson(c));
  if (!result.ok) return c.json({ message: 'Validation failed', errors: result.errors }, 400);

  const record: CompanyRecord = {
    id: randomUUID(),
    ...result.value,
    updatedAt: new Date().toISOString(),
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...toKey(record.id), ...record },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );
  return c.json(record, 201);
});

// POST /api/companies/import : bulk create companies (all-or-nothing validation)
app.post('/api/companies/import', async (c) => {
  const body = (await readJson(c)) as { records?: unknown } | null;
  if (!body || !Array.isArray(body.records)) {
    return c.json({ message: 'Request body must be { records: CompanyInput[] }' }, 400);
  }
  if (body.records.length === 0) return c.json({ message: 'records must not be empty' }, 400);
  if (body.records.length > IMPORT_MAX_RECORDS) {
    return c.json({ message: `Too many records (max ${IMPORT_MAX_RECORDS})` }, 400);
  }

  const now = new Date().toISOString();
  const records: CompanyRecord[] = [];
  const rowErrors: { index: number; errors: string[] }[] = [];
  body.records.forEach((raw, index) => {
    const result = validateInput(raw);
    if (result.ok) records.push({ id: randomUUID(), ...result.value, updatedAt: now });
    else rowErrors.push({ index, errors: result.errors });
  });
  if (rowErrors.length > 0) {
    return c.json({ message: 'Validation failed', rowErrors }, 400);
  }

  // BatchWrite accepts up to 25 items per request; retry unprocessed items with backoff
  for (let i = 0; i < records.length; i += 25) {
    let requests = records.slice(i, i + 25).map((r) => ({ PutRequest: { Item: { ...toKey(r.id), ...r } } }));
    for (let attempt = 0; requests.length > 0; attempt++) {
      if (attempt >= 8) throw new Error('BatchWrite retries exhausted');
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      const res = await docClient.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: requests } }));
      requests = (res.UnprocessedItems?.[TABLE_NAME] ?? []) as typeof requests;
    }
  }

  return c.json({ imported: records.length }, 201);
});

// PUT /api/companies/:id : replace a company's fields
app.put('/api/companies/:id', async (c) => {
  const id = c.req.param('id');
  const result = validateInput(await readJson(c));
  if (!result.ok) return c.json({ message: 'Validation failed', errors: result.errors }, 400);

  const record: CompanyRecord = {
    id,
    ...result.value,
    updatedAt: new Date().toISOString(),
  };
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...toKey(id), ...record },
        ConditionExpression: 'attribute_exists(PK)',
      }),
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return c.json({ message: 'Company not found' }, 404);
    throw err;
  }
  return c.json(record);
});

// DELETE /api/companies/:id : delete a company
app.delete('/api/companies/:id', async (c) => {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: toKey(c.req.param('id')),
        ConditionExpression: 'attribute_exists(PK)',
      }),
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return c.json({ message: 'Company not found' }, 404);
    throw err;
  }
  return c.body(null, 204);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: 'Internal Server Error' }, 500);
});

// ---------- bootstrap ----------

await ensureTable();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API server listening on http://localhost:${info.port}`);
});
