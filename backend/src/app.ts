import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { backupRoute } from './routes/backup';
import { companiesRoute } from './routes/companies';
import { NotFoundError, VersionConflictError } from './errors';

export function createApp({ log = true }: { log?: boolean } = {}) {
  const app = new Hono();

  if (log) app.use('*', logger());
  app.use('/api/*', cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' }));

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/api/companies', companiesRoute);
  app.route('/api/backup', backupRoute);

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ message: err.message }, 404);
    if (err instanceof VersionConflictError) return c.json({ message: err.message }, 409);
    if (err instanceof HTTPException) return c.json({ message: err.message }, err.status);
    console.error(err);
    return c.json({ message: 'Internal Server Error' }, 500);
  });

  return app;
}
