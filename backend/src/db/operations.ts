import { BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from './client';
import { USER_PK } from './keys';

type WriteRequest = { PutRequest: { Item: Record<string, unknown> } } | { DeleteRequest: { Key: Record<string, unknown> } };

/** Query all items in the user partition whose SK starts with `prefix` ('' = everything). */
export async function queryByPrefix(prefix: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: prefix ? 'PK = :pk AND begins_with(SK, :sk)' : 'PK = :pk',
        ExpressionAttributeValues: prefix ? { ':pk': USER_PK, ':sk': prefix } : { ':pk': USER_PK },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

/** BatchWrite in chunks of 25, retrying unprocessed items with exponential backoff. */
export async function batchWrite(requests: WriteRequest[]): Promise<void> {
  for (let i = 0; i < requests.length; i += 25) {
    let pending = requests.slice(i, i + 25);
    for (let attempt = 0; pending.length > 0; attempt++) {
      if (attempt >= 8) throw new Error('BatchWrite retries exhausted');
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      const res = await docClient.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: pending } }));
      pending = (res.UnprocessedItems?.[TABLE_NAME] ?? []) as WriteRequest[];
    }
  }
}

export const batchPut = (items: Record<string, unknown>[]) => batchWrite(items.map((Item) => ({ PutRequest: { Item } })));

export const batchDelete = (keys: { PK: unknown; SK: unknown }[]) =>
  batchWrite(keys.map(({ PK, SK }) => ({ DeleteRequest: { Key: { PK, SK } } })));
