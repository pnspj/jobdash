import { z } from 'zod';
import { LOCAL_DATETIME_RE } from './datetime';

/** Trimmed string; empty becomes undefined. */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** "" clears the value; otherwise must be YYYY-MM-DD or YYYY-MM-DDTHH:mm. */
export const optionalLocalDateTime = z
  .union([
    z.literal(''),
    z.string().regex(LOCAL_DATETIME_RE, 'YYYY-MM-DD または YYYY-MM-DDTHH:mm 形式で指定してください'),
  ])
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** Optimistic-lock version sent with every update. */
export const versionField = z.number().int().nonnegative();
