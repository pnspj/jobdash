import { serve } from '@hono/node-server';
import { createApp } from './app';
import { ensureTable } from './db/init-table';

const PORT = Number(process.env.PORT ?? 8787);
// Listen on loopback only: the API has no authentication
const HOST = process.env.HOST ?? '127.0.0.1';

await ensureTable();

const server = serve({ fetch: createApp().fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`API server listening on http://${HOST}:${info.port}`);
});

// Exit cleanly when stopped (e.g. by `npm start`), so npm does not report a failure
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
