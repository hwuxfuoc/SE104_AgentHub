import { handleMock } from '@/mocks/mock-server';
import { ApiError } from './errors';
import type { ApiResponse, Pagination } from './types';

export const API_MODE: 'mock' | 'real' = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const TOKEN_KEY = 'agenthub.admin.token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type Params = Record<string, string | number | boolean | undefined | null>;

const cleanQuery = (params?: Params) => {
  const out: Record<string, string> = {};
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  });
  return out;
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function raw(method: string, path: string, opts: { params?: Params; body?: unknown } = {}) {
  const query = cleanQuery(opts.params);
  const token = tokenStore.get();

  if (API_MODE === 'mock') {
    await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
    const res = handleMock(method, path, query, opts.body, token);
    return { status: res.status, json: res.body as any };
  }

  const qs = new URLSearchParams(query).toString();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'Network error' });
  }
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function request<T>(method: string, path: string, opts?: { params?: Params; body?: unknown }) {
  const { status, json } = await raw(method, path, opts);
  if (status >= 400 || json?.success === false) {
    if (status === 401 && path !== '/auth/login') onUnauthorized?.();
    throw new ApiError(status, json ?? {});
  }
  return json as ApiResponse<T>;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
};

export interface Paged<T> {
  items: T[];
  pagination: Pagination;
}

export async function getPaged<T>(path: string, params?: Params): Promise<Paged<T>> {
  const res = await api.get<T[]>(path, params);
  return {
    items: res.data,
    pagination: res.pagination ?? { total: res.data.length, page: 1, limit: res.data.length, totalPages: 1 },
  };
}

/** Tải file CSV báo cáo. Ở chế độ mock, CSV được sinh từ JSON (UTF-8 BOM như backend). */
export async function downloadCsv(path: string, params: Params, filename: string, mockRows: () => string[][]) {
  let content: BlobPart;
  if (API_MODE === 'mock') {
    content = '\ufeff' + mockRows().map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  } else {
    const qs = new URLSearchParams({ ...cleanQuery(params), format: 'csv' }).toString();
    const res = await fetch(`${BASE_URL}${path}?${qs}`, { headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` } });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
    content = await res.blob();
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
