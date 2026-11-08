import { createApp } from '../src/app';
import { batchDelete, queryByPrefix } from '../src/db/operations';

export const app = createApp({ log: false });

export async function clearTable() {
  const items = await queryByPrefix('');
  await batchDelete(items as { PK: string; SK: string }[]);
}

export async function call<T = unknown>(method: string, path: string, body?: unknown) {
  const res = await app.request(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: (text ? JSON.parse(text) : undefined) as T };
}
