import {
  companyImportSchema,
  companyInputSchema,
  companyPatchSchema,
  INTERVIEW_STAGE_KEYS,
  isInterviewStageKey,
  setInterviewSchema,
  setPreferredSlotsSchema,
} from '@jobdash/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { NotFoundError } from '../errors';
import { companyService } from '../services/companyService';
import { zValidator } from '../validation';

const versionQuery = z.object({ version: z.coerce.number().int().nonnegative() });

/** "first" | "second" | "final" -> stage label; unknown keys are 404. */
function stageParam(key: string) {
  if (!isInterviewStageKey(key)) throw new NotFoundError(`Unknown interview stage: ${key}`);
  return INTERVIEW_STAGE_KEYS[key];
}

export const companiesRoute = new Hono()
  .get('/', async (c) => c.json(await companyService.list()))

  .get('/:id', async (c) => c.json(await companyService.get(c.req.param('id'))))

  .post('/', zValidator('json', companyInputSchema), async (c) => {
    return c.json(await companyService.create(c.req.valid('json')), 201);
  })

  // Bulk create (CSV import). The whole request is rejected if any record is invalid.
  .post('/import', zValidator('json', companyImportSchema), async (c) => {
    return c.json(await companyService.import(c.req.valid('json').records), 201);
  })

  .patch('/:id', zValidator('json', companyPatchSchema), async (c) => {
    return c.json(await companyService.update(c.req.param('id'), c.req.valid('json')));
  })

  .delete('/:id', async (c) => {
    await companyService.delete(c.req.param('id'));
    return c.body(null, 204);
  })

  // ----- schedule -----

  .put('/:id/interviews/:stage', zValidator('json', setInterviewSchema), async (c) => {
    const { version, start, end } = c.req.valid('json');
    return c.json(
      await companyService.setInterview(c.req.param('id'), stageParam(c.req.param('stage')), { start, end }, version),
    );
  })

  .delete('/:id/interviews/:stage', zValidator('query', versionQuery), async (c) => {
    const { version } = c.req.valid('query');
    return c.json(await companyService.removeInterview(c.req.param('id'), stageParam(c.req.param('stage')), version));
  })

  .put('/:id/preferred-slots', zValidator('json', setPreferredSlotsSchema), async (c) => {
    const { version, slots } = c.req.valid('json');
    return c.json(await companyService.setPreferredSlots(c.req.param('id'), slots, version));
  });
