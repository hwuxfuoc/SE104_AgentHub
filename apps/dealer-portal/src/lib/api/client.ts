import { ApiError } from './errors';
import { handleMock } from '@/mocks/mock-server';
import type { ApiResponse, Pagination } from './types';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const API_MODE = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';

const TOKEN_KEY = 'agenthub.dealer.token';
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
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, opts: { params?: Params; body?: unknown } = {}) {
  const query = cleanQuery(opts.params);
  const qs = new URLSearchParams(query).toString();
  const token = tokenStore.get();

  let status: number;
  let json: any;

  if (API_MODE === 'mock') {
    const result = handleMock(method, path, query, opts.body, token);
    status = result.status;
    json = result.body;
  } else {
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
      throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ' });
    }
    status = response.status;
    json = await response.json().catch(() => ({}));
  }

  if (status >= 400 || json?.success === false) {
    if (status === 401 && path !== '/auth/login') onUnauthorized?.();
    throw new ApiError(status, json ?? {});
  }
  return json as ApiResponse<T>;
}

export const api = {
  get:   <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post:  <T>(path: string, body?: unknown)  => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown)  => request<T>('PATCH', path, { body }),
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
