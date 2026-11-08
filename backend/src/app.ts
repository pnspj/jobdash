import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { BadRequestError, ConflictError, NotFoundError, VersionConflictError } from './errors';
import { allowedHosts, DEFAULT_ALLOWED_HOSTS } from './middleware/security';
import { agentsRoute } from './routes/agents';
import { backupRoute } from './routes/backup';
import { companiesRoute } from './routes/companies';
import { dataRoute } from './routes/data';
import { resumeRoute } from './routes/resume';

export const MAX_BODY_BYTES = 5 * 1024 * 1024;

export function createApp({ log = true }: { log?: boolean } = {}) {
  const app = new Hono();

  if (log) app.use('*', logger());
  app.use('*', allowedHosts(process.env.ALLOWED_HOSTS?.split(',').map((h) => h.trim()) ?? DEFAULT_ALLOWED_HOSTS));
  // Backups and CSV imports are the largest requests; a few MB is plenty for personal data
  app.use(
    '/api/*',
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ message: 'Request body too large' }, 413) }),
  );
  app.use('/api/*', cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/api/companies', companiesRoute);
  app.route('/api/agents', agentsRoute);
  app.route('/api/resume', resumeRoute);
  app.route('/api/backup', backupRoute);
  app.route('/api/data', dataRoute);

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ message: err.message }, 404);
    if (err instanceof VersionConflictError) return c.json({ message: err.message, code: 'VERSION_CONFLICT' }, 409);
    if (err instanceof ConflictError) return c.json({ message: err.message }, 409);
    if (err instanceof BadRequestError) return c.json({ message: err.message }, 400);
    if (err instanceof HTTPException) return c.json({ message: err.message }, err.status);
    console.error(err);
    return c.json({ message: 'Internal Server Error' }, 500);
  });

  return app;
}
