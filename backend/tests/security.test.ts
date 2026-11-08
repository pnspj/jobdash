import { expect, test } from 'vitest';
import { MAX_BODY_BYTES } from '../src/app';
import { app } from './helpers';

test('requests for a non-local Host are rejected (DNS rebinding)', async () => {
  expect((await app.request('http://evil.example/api/companies')).status).toBe(403);
  expect((await app.request('http://localhost/health')).status).toBe(200);
  expect((await app.request('http://127.0.0.1/health')).status).toBe(200);
});

test('oversized request bodies are rejected', async () => {
  const res = await app.request('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(MAX_BODY_BYTES + 1) },
    body: 'x'.repeat(MAX_BODY_BYTES + 1),
  });
  expect(res.status).toBe(413);
});

test('javascript: URLs are rejected', async () => {
  const res = await app.request('/api/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: 'A社',
      phase: '書類選考',
      action: '選考結果待ち',
      companyUrl: 'javascript:alert(1)',
    }),
  });
  expect(res.status).toBe(400);
});
