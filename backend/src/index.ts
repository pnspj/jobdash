import { serve } from '@hono/node-server';
import { createApp } from './app';
import { DataFileError, initDataStore } from './store/dataStore';

const PORT = Number(process.env.PORT ?? 8787);
// Listen on loopback only: the API has no authentication
const HOST = process.env.HOST ?? '127.0.0.1';

try {
  console.log(`Data file: ${await initDataStore()}`);
} catch (err) {
  if (!(err instanceof DataFileError)) throw err;
  // Refuse to start rather than overwrite a broken file
  console.error(err.message);
  console.error('データファイルを修正するか、別の場所へ移してから起動してください。');
  process.exit(1);
}

const server = serve({ fetch: createApp().fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`API server listening on http://${HOST}:${info.port}`);
});

// Exit cleanly when stopped (e.g. by `npm start`), so npm does not report a failure
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
