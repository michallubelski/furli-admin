import { getCurrentLocale } from '../i18n';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export interface ApiErrorField {
  field: string;
  message: string;
}

interface ApiErrorPayload {
  message?: string;
  fieldErrors?: ApiErrorField[];
}

export class ApiClientError extends Error {
  status: number;
  fieldErrors: ApiErrorField[];

  constructor(status: number, message: string, fieldErrors: ApiErrorField[] = []) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let unauthorizedHandler: ((error: ApiClientError) => void) | null = null;

export function registerUnauthorizedHandler(handler: ((error: ApiClientError) => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function parseJson<T>(res: Response): Promise<T | null> {
  const raw = await res.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token?: string;
    body?: unknown;
    headers?: HeadersInit;
    fallbackMessage: string;
    notifyUnauthorized?: boolean;
  },
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: options.method || 'GET',
      headers: {
        'Accept-Language': getCurrentLocale(),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(0, options.fallbackMessage);
  }

  if (!res.ok) {
    const data = await parseJson<ApiErrorPayload>(res);
    const error = new ApiClientError(
      res.status,
      data?.message || options.fallbackMessage,
      Array.isArray(data?.fieldErrors) ? data.fieldErrors : [],
    );
    if (res.status === 401 && options.notifyUnauthorized !== false) {
      unauthorizedHandler?.(error);
    }
    throw error;
  }

  return parseJson<T>(res);
}
