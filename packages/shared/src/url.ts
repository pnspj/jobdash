import { z } from 'zod';

/** Only http(s) URLs are accepted: other schemes (javascript:, data:, ...) could run code when clicked. */
export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Optional http(s) URL; empty becomes undefined. */
export const optionalHttpUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || isHttpUrl(v), 'http:// または https:// で始まる URL を指定してください')
  .transform((v) => (v === '' ? undefined : v))
  .optional();
