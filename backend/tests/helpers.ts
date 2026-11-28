import { createApp } from '../src/app';
import { emptyData, replaceData } from '../src/store/dataStore';

export const app = createApp({ log: false });

export const clearData = () => replaceData(emptyData());

export async function call<T = unknown>(method: string, path: string, body?: unknown) {
  const res = await app.request(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: (text ? JSON.parse(text) : undefined) as T };
}
