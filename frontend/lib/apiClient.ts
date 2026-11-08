const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: string[] = [],
  ) {
    super(message);
  }
}

/** JSON fetch against the backend API. Throws ApiError on non-2xx responses. */
export async function apiRequest<T>(path: string, init?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init?.body === undefined ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let errors: string[] = [];
    try {
      const body = (await res.json()) as { message?: string; errors?: string[]; code?: string };
      message = body.message ?? message;
      errors = body.errors ?? [];
      // Only optimistic-lock failures get the "reload" message; other 409s (duplicate, in use) keep the server message
      if (body.code === 'VERSION_CONFLICT')
        message = '他の画面で更新されています。再読み込みしてからやり直してください。';
    } catch {
      // non-JSON error body
    }
    if (errors.length) message = `${message}: ${errors.slice(0, 5).join(' / ')}`;
    throw new ApiError(res.status, message, errors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
