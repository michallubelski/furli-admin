import { apiRequest, ApiClientError, type ApiErrorField } from '../../shared/api/client';
import type { AdminAccount } from '../../shared/types/furli';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthErrorItem extends ApiErrorField {}

export interface AdminSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  admin: AdminAccount;
}

interface AdminLoginResponsePayload {
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  admin?: AdminAccount;
}

export class AuthApiError extends ApiClientError {
  constructor(status: number, message: string, fieldErrors: AuthErrorItem[] = []) {
    super(status, message, fieldErrors);
    this.name = 'AuthApiError';
  }
}

function asAuthError(error: unknown, fallbackMessage: string): AuthApiError {
  if (error instanceof ApiClientError) {
    return new AuthApiError(error.status, error.message, error.fieldErrors);
  }
  return new AuthApiError(0, fallbackMessage);
}

function normalizeAdminSession(data: AdminLoginResponsePayload | null): AdminSession {
  return {
    accessToken: String(data?.accessToken || ''),
    refreshToken: data?.refreshToken ? String(data.refreshToken) : null,
    expiresAt: data?.expiresAt ? String(data.expiresAt) : null,
    admin: (data?.admin || null) as AdminAccount,
  };
}

export async function loginAdmin(payload: LoginPayload): Promise<AdminSession> {
  try {
    const data = await apiRequest<AdminLoginResponsePayload>('/api/admin/auth/login', {
      method: 'POST',
      body: {
        email: payload.email.trim(),
        password: payload.password,
      },
      fallbackMessage: 'Backend logowania administratora jest niedostępny.',
      notifyUnauthorized: false,
    });
    const session = normalizeAdminSession(data);
    if (!session.accessToken || !session.admin) {
      throw new AuthApiError(500, 'Backend zwrócił niepełną odpowiedź logowania administratora.');
    }
    return session;
  } catch (error) {
    throw asAuthError(error, 'Nie udało się zalogować administratora.');
  }
}

export async function logoutSession(session: AdminSession): Promise<void> {
  try {
    await apiRequest<void>('/api/admin/auth/logout', {
      method: 'POST',
      token: session.accessToken,
      fallbackMessage: 'Nie udało się wylogować.',
      notifyUnauthorized: false,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return;
    }
    throw asAuthError(error, 'Nie udało się wylogować.');
  }
}
