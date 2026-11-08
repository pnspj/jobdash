import { serve } from '@hono/node-server';
import { createApp } from './app';
import { ensureTable } from './db/init-table';

const PORT = Number(process.env.PORT ?? 8787);

await ensureTable();

serve({ fetch: createApp().fetch, port: PORT }, (info) => {
  console.log(`API server listening on http://localhost:${info.port}`);
});
