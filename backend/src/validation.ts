import { zValidator as baseValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

/** zod validator that responds with a uniform 400 body: { message, errors: ["path: message", ...] }. */
export const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  baseValidator(target, schema, (result, c) => {
    if (!result.success) {
      const errors = result.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message));
      return c.json({ message: 'Validation failed', errors }, 400);
    }
  });
