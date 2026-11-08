import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME = process.env.TABLE_NAME ?? 'JobHuntingTable';
export const USER_PK = 'USER#me';
export const COMPANY_SK_PREFIX = 'COMPANY#';

export const ddbClient = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
  // dynamodb-local accepts any credentials
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  },
});

export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    // Drop undefined optional fields (companyUrl, agentJobUrl) instead of throwing
    removeUndefinedValues: true,
  },
});
