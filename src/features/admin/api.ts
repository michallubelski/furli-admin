import { apiRequest, ApiClientError } from '../../shared/api/client';
import type { AdminAccount, AdminActivityLogEntry, ProviderAccount, ProviderType, VerificationStatus } from '../../shared/types/furli';
import type { AdminGdprRequest, AdminProviderRecord as AdminProviderUiRecord, AdminReferralCode, AdminReportRecord, AdminReviewRecord, AdminBroadcastRecord } from './model';
import type { CatalogKind } from './catalog';

export interface AdminProviderDto extends ProviderAccount {
  suspended?: boolean;
  history?: AdminActivityLogEntry[];
}

export type AdminProviderStatusParam = 'PENDING' | 'APPROVED' | 'REJECTED';

export class AdminApiError extends ApiClientError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = 'AdminApiError';
  }
}

function asAdminError(error: unknown, fallbackMessage: string): AdminApiError {
  if (error instanceof ApiClientError) {
    return new AdminApiError(error.status, error.message);
  }
  return new AdminApiError(0, fallbackMessage);
}

function typeLabel(type: ProviderType): string {
  switch (type) {
    case 'veterinarian':
      return 'Weterynarz';
    case 'groomer':
      return 'Groomer';
    case 'trainer':
      return 'Trener';
    case 'petsitter':
      return 'Petsitter';
    case 'walker':
      return 'Dog walker';
    default:
      return 'Placówka';
  }
}

function parseCreatedAtAgeDays(createdAt: string): number {
  const match = createdAt.match(/^(\d{1,2})\s/);
  if (!match) {
    return 0;
  }
  const submittedDay = Number(match[1]);
  const currentDay = new Date().getDate();
  return Math.max(0, currentDay - submittedDay);
}

export function mapAdminProviderDto(dto: AdminProviderDto, current?: AdminProviderUiRecord | null): AdminProviderUiRecord {
  const profile = dto.profile;
  // billingStatus/billingPlan/monthlyValue/trialDaysLeft are computed by the backend
  // (see ProviderAccountResponse) from the authoritative Plan/BillingStatus model — don't
  // re-derive pricing or status mapping here.
  const billingStatus = dto.billingStatus || 'trial';
  const billingPlan = dto.billingPlan || 'main';
  return {
    id: dto.id,
    name: profile.name,
    typeLabel: typeLabel(profile.type),
    city: profile.city,
    district: profile.district,
    street: [profile.street, profile.houseNumber].filter(Boolean).join(' '),
    postalCode: profile.postalCode,
    contactName: dto.contactName,
    email: dto.email,
    phone: dto.phone,
    verificationStatus: dto.verificationStatus as VerificationStatus,
    suspended: typeof dto.suspended === 'boolean' ? dto.suspended : current?.suspended ?? false,
    submittedAt: dto.createdAt,
    ageDays: parseCreatedAtAgeDays(dto.createdAt),
    rating: profile.rating,
    reviewsCount: profile.reviews,
    billingStatus,
    billingPlan,
    monthlyValue: dto.monthlyValue ?? 0,
    trialDaysLeft: dto.trialDaysLeft,
    billingPhase: dto.billing.phase,
    publishedAt: dto.billing.publishedAt,
    daysLeft: dto.billing.daysLeft,
    publishReadiness: dto.publishReadiness
      ? { ...dto.publishReadiness, missing: Array.isArray(dto.publishReadiness.missing) ? dto.publishReadiness.missing : [] }
      : null,
    documents: [
      { id: `${dto.id}-business`, label: 'business', status: 'ok' },
      { id: `${dto.id}-profile`, label: 'profile', status: profile.description ? 'ok' : 'missing' },
      { id: `${dto.id}-services`, label: 'services', status: Array.isArray(profile.services) && profile.services.length ? 'ok' : 'missing' },
    ],
    notes: [],
  };
}

export async function getAdminUsers(accessToken: string): Promise<AdminAccount[]> {
  try {
    const data = await apiRequest<AdminAccount[]>('/api/admin/users', {
      method: 'GET',
      token: accessToken,
      fallbackMessage: 'Nie udało się pobrać użytkowników administratora.',
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw asAdminError(error, 'Nie udało się pobrać użytkowników administratora.');
  }
}

export async function getAdminProviders(accessToken: string, status?: AdminProviderStatusParam): Promise<AdminProviderDto[]> {
  try {
    const data = await apiRequest<AdminProviderDto[]>(`/api/admin/providers${status ? `?status=${status}` : ''}`, {
      method: 'GET',
      token: accessToken,
      fallbackMessage: 'Nie udało się pobrać placówek.',
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw asAdminError(error, 'Nie udało się pobrać placówek.');
  }
}

export async function getAdminPendingProviderCount(accessToken: string): Promise<number> {
  try {
    const data = await apiRequest<number>('/api/admin/providers/pending-count', {
      method: 'GET',
      token: accessToken,
      fallbackMessage: 'Nie udało się pobrać liczby placówek oczekujących.',
    });
    return typeof data === 'number' ? data : 0;
  } catch (error) {
    throw asAdminError(error, 'Nie udało się pobrać liczby placówek oczekujących.');
  }
}

export async function getAdminProvider(accessToken: string, providerId: string): Promise<AdminProviderDto> {
  try {
    const data = await apiRequest<AdminProviderDto>(`/api/admin/providers/${providerId}`, {
      method: 'GET',
      token: accessToken,
      fallbackMessage: 'Nie udało się pobrać szczegółów placówki.',
    });
    if (!data?.id) {
      throw new AdminApiError(500, 'Backend zwrócił niepełne dane placówki.');
    }
    return data;
  } catch (error) {
    throw asAdminError(error, 'Nie udało się pobrać szczegółów placówki.');
  }
}

async function postProviderDecision(
  accessToken: string,
  providerId: string,
  actionPath: string,
  fallbackMessage: string,
  body?: unknown,
): Promise<AdminProviderDto> {
  try {
    const data = await apiRequest<AdminProviderDto>(`/api/admin/providers/${providerId}/${actionPath}`, {
      method: 'POST',
      token: accessToken,
      body,
      fallbackMessage,
    });
    if (!data?.id) {
      throw new AdminApiError(500, 'Backend zwrócił niepełną odpowiedź aktualizacji placówki.');
    }
    return data;
  } catch (error) {
    throw asAdminError(error, fallbackMessage);
  }
}

export function approveProvider(accessToken: string, providerId: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'approve', 'Nie udało się zatwierdzić placówki.');
}

export function rejectProvider(accessToken: string, providerId: string, note: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'reject', 'Nie udało się odrzucić placówki.', { note });
}

export function requestProviderChanges(accessToken: string, providerId: string, note: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'request-changes', 'Nie udało się wysłać prośby o uzupełnienie.', { note });
}

export function suspendProvider(accessToken: string, providerId: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'suspend', 'Nie udało się zawiesić placówki.');
}

export function reactivateProvider(accessToken: string, providerId: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'reactivate', 'Nie udało się przywrócić placówki.');
}

export function extendProviderTrial(accessToken: string, providerId: string, days?: number): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'billing/extend-trial', 'Nie udało się przedłużyć okresu próbnego.', days ? { days } : undefined);
}

export function applyProviderDiscount(accessToken: string, providerId: string, percent: number, durationMonths: number): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'billing/discount', 'Nie udało się przyznać rabatu.', { percent, durationMonths });
}

export async function getAdminActivity(accessToken: string, limit?: number): Promise<AdminActivityLogEntry[]> {
  try {
    const data = await apiRequest<AdminActivityLogEntry[]>(`/api/admin/activity${limit ? `?limit=${limit}` : ''}`, {
      method: 'GET',
      token: accessToken,
      fallbackMessage: 'Nie udało się pobrać ostatniej aktywności.',
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw asAdminError(error, 'Nie udało się pobrać ostatniej aktywności.');
  }
}

export interface AdminNotificationDto {
  id: string;
  kind: string;
  title: string;
  body: string;
  targetPath?: string | null;
  read: boolean;
  createdAt: string;
}

export interface AdminStatsOverviewDto {
  providers: number;
  publishedProviders: number;
  customers: number;
  bookings: number;
  completedBookings: number;
  canceledBookings: number;
  reviews: number;
  dailyBookings: Array<{ date: string; total: number; furli: number; own: number }>;
}
export interface AdminCatalogEntryDto { id: string; kind: CatalogKind; providerType: ProviderType; key: string; label: string; description: string; hidden: boolean }
export interface AdminAuditEventDto { id: string; action: string; target: string; actor: string; timestamp: string }

async function adminGet<T>(accessToken: string, path: string, fallbackMessage: string): Promise<T> {
  const data = await apiRequest<T>(path, { method: 'GET', token: accessToken, fallbackMessage });
  return data as T;
}

async function adminWrite<T>(accessToken: string, path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body: unknown, fallbackMessage: string): Promise<T | null> {
  return apiRequest<T>(path, { method, token: accessToken, body, fallbackMessage });
}

export async function getAdminReviews(accessToken: string): Promise<AdminReviewRecord[]> {
  return adminGet(accessToken, '/api/admin/reviews', 'Nie udało się pobrać opinii.');
}
export async function moderateAdminReview(accessToken: string, id: string, status: AdminReviewRecord['status'], reason?: string): Promise<void> {
  await adminWrite(accessToken, `/api/admin/reviews/${id}`, 'PATCH', { status, reason }, 'Nie udało się zmienić statusu opinii.');
}
export async function getAdminReports(accessToken: string): Promise<AdminReportRecord[]> {
  const reports = await adminGet<Array<Omit<AdminReportRecord, 'priority'> & { priority: 'low' | 'medium' | 'high' }>>(accessToken, '/api/admin/reports', 'Nie udało się pobrać zgłoszeń.');
  return reports.map((report) => ({ ...report, priority: report.priority === 'high' ? 'Wysoka' : report.priority === 'medium' ? 'Średnia' : 'Niska' }));
}
export async function updateAdminReport(accessToken: string, id: string, status: AdminReportRecord['status']): Promise<void> {
  await adminWrite(accessToken, `/api/admin/reports/${id}`, 'PATCH', { status }, 'Nie udało się zmienić statusu zgłoszenia.');
}
export async function getAdminBroadcasts(accessToken: string): Promise<AdminBroadcastRecord[]> {
  return adminGet(accessToken, '/api/admin/broadcasts', 'Nie udało się pobrać komunikatów.');
}
export async function createAdminBroadcast(accessToken: string, title: string, audience: string, channel: string): Promise<AdminBroadcastRecord> {
  return (await adminWrite<AdminBroadcastRecord>(accessToken, '/api/admin/broadcasts', 'POST', { title, audience, channel }, 'Nie udało się wysłać komunikatu.'))!;
}
export async function getAdminReferralCodes(accessToken: string): Promise<AdminReferralCode[]> {
  return adminGet(accessToken, '/api/admin/referral-codes', 'Nie udało się pobrać kodów polecających.');
}
export async function createAdminReferralCode(accessToken: string, code: string, discountLabel: string, maxUses: number): Promise<AdminReferralCode> {
  return (await adminWrite<AdminReferralCode>(accessToken, '/api/admin/referral-codes', 'POST', { code, discountLabel, maxUses }, 'Nie udało się utworzyć kodu.'))!;
}
export async function getAdminGdprRequests(accessToken: string): Promise<AdminGdprRequest[]> {
  const rows = await adminGet<Array<{ id: string; type: string; subject: string; status: string; openedAt: string }>>(accessToken, '/api/admin/gdpr-requests', 'Nie udało się pobrać żądań RODO.');
  return rows.filter((row) => row.status === 'open').map(({ id, type, subject, openedAt }) => ({ id, type, subject, openedAt }));
}
export async function completeAdminGdprRequest(accessToken: string, id: string): Promise<void> {
  await adminWrite(accessToken, `/api/admin/gdpr-requests/${id}/complete`, 'POST', undefined, 'Nie udało się zrealizować żądania RODO.');
}
export async function getAdminNotifications(accessToken: string): Promise<AdminNotificationDto[]> {
  return adminGet(accessToken, '/api/admin/notifications', 'Nie udało się pobrać powiadomień.');
}
export async function readAdminNotification(accessToken: string, id: string): Promise<void> {
  await adminWrite(accessToken, `/api/admin/notifications/${id}/read`, 'POST', undefined, 'Nie udało się oznaczyć powiadomienia jako przeczytane.');
}
export async function getAdminStats(accessToken: string, from: string, to: string): Promise<AdminStatsOverviewDto> {
  return adminGet(accessToken, `/api/admin/stats/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, 'Nie udało się pobrać statystyk.');
}
export async function getAdminCatalog(accessToken: string): Promise<AdminCatalogEntryDto[]> {
  return adminGet(accessToken, '/api/admin/catalog', 'Nie udało się pobrać katalogu.');
}
export async function getAdminAudit(accessToken: string): Promise<AdminAuditEventDto[]> {
  return adminGet(accessToken, '/api/admin/audit', 'Nie udało się pobrać dziennika audytowego.');
}
export async function createAdminCatalogEntry(accessToken: string, kind: CatalogKind, providerType: ProviderType, key: string, label: string, description: string): Promise<void> {
  await adminWrite(accessToken, '/api/admin/catalog', 'POST', { kind, providerType, key, label, description }, 'Nie udało się dodać pozycji katalogu.');
}
export async function updateAdminCatalogEntry(accessToken: string, kind: CatalogKind, providerType: ProviderType, key: string, label: string, description: string): Promise<void> {
  await adminWrite(accessToken, `/api/admin/catalog/${kind}/${providerType}/${encodeURIComponent(key)}`, 'PUT', { kind, providerType, key, label, description }, 'Nie udało się zapisać pozycji katalogu.');
}
export async function setAdminCatalogVisibility(accessToken: string, kind: CatalogKind, providerType: ProviderType, key: string, hidden: boolean): Promise<void> {
  await adminWrite(accessToken, `/api/admin/catalog/${kind}/${providerType}/${encodeURIComponent(key)}/visibility`, 'PATCH', { hidden }, 'Nie udało się zmienić widoczności pozycji.');
}
export async function deleteAdminCatalogEntry(accessToken: string, kind: CatalogKind, providerType: ProviderType, key: string): Promise<void> {
  await adminWrite(accessToken, `/api/admin/catalog/${kind}/${providerType}/${encodeURIComponent(key)}`, 'DELETE', undefined, 'Nie udało się usunąć pozycji katalogu.');
}
