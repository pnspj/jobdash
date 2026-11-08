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
      const body = (await res.json()) as { message?: string; errors?: string[] };
      message = body.message ?? message;
      errors = body.errors ?? [];
    } catch {
      // non-JSON error body
    }
    if (res.status === 409) message = '他の画面で更新されています。再読み込みしてからやり直してください。';
    else if (errors.length) message = `${message}: ${errors.slice(0, 5).join(' / ')}`;
    throw new ApiError(res.status, message, errors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
