import { randomUUID } from 'node:crypto';
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import type { Company, CompanyInputParsed, CompanyPatchParsed } from '@jobdash/shared';
import { docClient, TABLE_NAME } from '../db/client';
import { itemKey, skPrefix, stripKeys } from '../db/keys';
import { batchPut, queryByPrefix } from '../db/operations';
import { NotFoundError, VersionConflictError } from '../errors';

const TYPE = 'COMPANY' as const;

const toItem = (c: Company) => ({ ...itemKey(TYPE, c.id), type: TYPE, ...c });

function newCompany(input: CompanyInputParsed, now: string): Company {
  return { id: randomUUID(), ...input, version: 1, createdAt: now, updatedAt: now };
}

export const companyRepository = {
  async list(): Promise<Company[]> {
    const items = await queryByPrefix(skPrefix(TYPE));
    return items.map((i) => stripKeys<Company>(i));
  },

  async get(id: string): Promise<Company | undefined> {
    const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: itemKey(TYPE, id) }));
    return res.Item ? stripKeys<Company>(res.Item) : undefined;
  },

  async create(input: CompanyInputParsed): Promise<Company> {
    const company = newCompany(input, new Date().toISOString());
    await docClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: toItem(company), ConditionExpression: 'attribute_not_exists(PK)' }),
    );
    return company;
  },

  async createMany(inputs: CompanyInputParsed[]): Promise<Company[]> {
    const now = new Date().toISOString();
    const companies = inputs.map((input) => newCompany(input, now));
    await batchPut(companies.map(toItem));
    return companies;
  },

  /**
   * Apply a partial update with optimistic locking.
   * Keys present in `patch` with null/undefined are removed; absent keys are left untouched.
   */
  async update(id: string, patch: CompanyPatchParsed): Promise<Company> {
    const current = await this.get(id);
    if (!current) throw new NotFoundError('Company not found');
    const { version, ...changes } = patch;
    if (current.version !== version) throw new VersionConflictError();

    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined) delete next[key];
      else next[key] = value;
    }
    const updated = { ...next, version: version + 1, updatedAt: new Date().toISOString() } as Company;

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: toItem(updated),
          ConditionExpression: 'version = :v',
          ExpressionAttributeValues: { ':v': version },
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) throw new VersionConflictError();
      throw err;
    }
    return updated;
  },

  async delete(id: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: itemKey(TYPE, id), ConditionExpression: 'attribute_exists(PK)' }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) throw new NotFoundError('Company not found');
      throw err;
    }
  },
};
