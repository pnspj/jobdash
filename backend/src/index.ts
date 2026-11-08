import { serve } from '@hono/node-server';
import { createApp } from './app';
import { ensureTable } from './db/init-table';

const PORT = Number(process.env.PORT ?? 8787);
// Listen on loopback only: the API has no authentication
const HOST = process.env.HOST ?? '127.0.0.1';

await ensureTable();

serve({ fetch: createApp().fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`API server listening on http://${HOST}:${info.port}`);
});
