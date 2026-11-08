import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { pathToFileURL } from 'node:url';
import { ddbClient, TABLE_NAME } from './client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create JobHuntingTable (PK: string, SK: string) if it does not exist.
 * Retries while dynamodb-local is still booting.
 */
export async function ensureTable(maxRetries = 10): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await ddbClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`[init-table] Table "${TABLE_NAME}" already exists.`);
      return;
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        break;
      }
      if (attempt >= maxRetries) {
        throw err;
      }
      console.log(`[init-table] DynamoDB not reachable yet (attempt ${attempt}/${maxRetries}), retrying...`);
      await sleep(1000);
    }
  }

  console.log(`[init-table] Creating table "${TABLE_NAME}"...`);
  await ddbClient.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }),
  );
  await waitUntilTableExists({ client: ddbClient, maxWaitTime: 30 }, { TableName: TABLE_NAME });
  console.log(`[init-table] Table "${TABLE_NAME}" created.`);
}

// Allow running directly: `npm run init-table`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  ensureTable().catch((err) => {
    console.error('[init-table] Failed:', err);
    process.exit(1);
  });
}
