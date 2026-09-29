import { apiRequest, ApiClientError } from '../../../shared/api/client';
import type { CatalogDocument, CatalogRevisionDto, ServiceCatalogAdminState } from './types';

// furli-backend's /api/admin/service-catalog (ServiceCatalogAdminController). Errors come back as
// ApiClientError with the backend's localized message - a 409 means the draft changed meanwhile, a
// 422 on publish that the draft still has issues (the draft's own `issues` list them).

const BASE = '/api/admin/service-catalog';

function required<T>(data: T | null, fallback: string): T {
  if (data === null) throw new ApiClientError(500, fallback);
  return data;
}

export async function getServiceCatalogAdmin(token: string): Promise<ServiceCatalogAdminState> {
  return required(await apiRequest<ServiceCatalogAdminState>(BASE, { token, fallbackMessage: 'Nie udało się wczytać katalogu usług.' }), 'Nie udało się wczytać katalogu usług.');
}

export async function saveServiceCatalogDraft(token: string, document: CatalogDocument, lockVersion: number | null): Promise<ServiceCatalogAdminState> {
  return required(await apiRequest<ServiceCatalogAdminState>(`${BASE}/draft`, {
    method: 'PUT',
    token,
    body: { document, lockVersion },
    fallbackMessage: 'Nie udało się zapisać szkicu katalogu.',
  }), 'Nie udało się zapisać szkicu katalogu.');
}

export async function discardServiceCatalogDraft(token: string, lockVersion: number): Promise<ServiceCatalogAdminState> {
  return required(await apiRequest<ServiceCatalogAdminState>(`${BASE}/draft?lockVersion=${encodeURIComponent(String(lockVersion))}`, {
    method: 'DELETE',
    token,
    fallbackMessage: 'Nie udało się odrzucić szkicu katalogu.',
  }), 'Nie udało się odrzucić szkicu katalogu.');
}

export async function publishServiceCatalogDraft(token: string, lockVersion: number): Promise<ServiceCatalogAdminState> {
  return required(await apiRequest<ServiceCatalogAdminState>(`${BASE}/draft/publish`, {
    method: 'POST',
    token,
    body: { lockVersion },
    fallbackMessage: 'Nie udało się opublikować katalogu.',
  }), 'Nie udało się opublikować katalogu.');
}

export async function getServiceCatalogRevisions(token: string): Promise<CatalogRevisionDto[]> {
  return (await apiRequest<CatalogRevisionDto[]>(`${BASE}/revisions`, { token, fallbackMessage: 'Nie udało się wczytać historii katalogu.' })) ?? [];
}
