import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EMPTY_RESUME_CONTENT, type Resume, type ResumeContent, resumeSchema } from '@jobdash/shared';
import { docClient, TABLE_NAME } from '../db/client';
import { itemKey, stripKeys } from '../db/keys';
import { VersionConflictError } from '../errors';

/** The single resume document (SK = RESUME#main). */
const KEY = itemKey('RESUME', 'main');

export const resumeRepository = {
  toItem: (r: Resume): Record<string, unknown> => ({ ...KEY, type: 'RESUME', ...r }),

  /**
   * The stored resume, or an empty one with version 0 when nothing has been saved yet.
   * Parsed so that documents saved by older versions are upgraded (see migrateLegacyResume).
   */
  async get(): Promise<Resume> {
    const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: KEY }));
    return res.Item ? resumeSchema.parse(stripKeys(res.Item)) : { ...EMPTY_RESUME_CONTENT, version: 0, updatedAt: '' };
  },

  /** Replace the whole document. `version` is the version the client edited (0 = first save). */
  async put(content: ResumeContent, version: number): Promise<Resume> {
    const resume: Resume = { ...content, version: version + 1, updatedAt: new Date().toISOString() };
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: this.toItem(resume),
          ...(version === 0
            ? { ConditionExpression: 'attribute_not_exists(PK)' }
            : { ConditionExpression: 'version = :v', ExpressionAttributeValues: { ':v': version } }),
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) throw new VersionConflictError();
      throw err;
    }
    return resume;
  },
};
