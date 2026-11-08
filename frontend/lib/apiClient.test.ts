import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, apiRequest } from './apiClient';

const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest error messages', () => {
  test('version conflict (409 with code) asks to reload', async () => {
    respond(409, { message: 'stale', code: 'VERSION_CONFLICT' });
    await expect(apiRequest('/x')).rejects.toThrow('他の画面で更新されています');
  });

  test('other 409s keep the server message (e.g. duplicate short name)', async () => {
    respond(409, { message: '略称「MA」は「○○エージェント」で使用されています' });
    const err = await apiRequest('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe('略称「MA」は「○○エージェント」で使用されています');
  });

  test('validation errors are appended to the message', async () => {
    respond(400, { message: 'Validation failed', errors: ['name: エージェント名は必須です'] });
    await expect(apiRequest('/x')).rejects.toThrow('Validation failed: name: エージェント名は必須です');
  });
});
