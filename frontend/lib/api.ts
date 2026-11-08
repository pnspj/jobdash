import type { CompanyInput, CompanyRecord } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: string[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let errors: string[] | undefined;
    try {
      const body = (await res.json()) as { message?: string; errors?: string[] };
      message = body.message ?? message;
      errors = body.errors;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, errors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const fetchCompanies = () => request<CompanyRecord[]>('/api/companies');

export const fetchCompany = (id: string) => request<CompanyRecord>(`/api/companies/${encodeURIComponent(id)}`);

export const createCompany = (input: CompanyInput) =>
  request<CompanyRecord>('/api/companies', { method: 'POST', body: JSON.stringify(input) });

export const updateCompany = (id: string, input: CompanyInput) =>
  request<CompanyRecord>(`/api/companies/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteCompany = (id: string) =>
  request<void>(`/api/companies/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Strip server-managed fields so a record can be sent back via PUT. */
export const toInput = ({ id: _id, updatedAt: _u, ...rest }: CompanyRecord): CompanyInput => rest;
