import { apiRequest, ApiClientError } from '../../shared/api/client';
import type { AdminAccount, AdminActivityLogEntry, ProviderAccount, ProviderType, VerificationStatus } from '../../shared/types/furli';
import type { AdminProviderRecord as AdminProviderUiRecord } from './model';

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
    publishReadiness: dto.publishReadiness,
    documents: [
      { id: `${dto.id}-business`, label: 'business', status: 'ok' },
      { id: `${dto.id}-profile`, label: 'profile', status: profile.description ? 'ok' : 'missing' },
      { id: `${dto.id}-services`, label: 'services', status: profile.services.length ? 'ok' : 'missing' },
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

export function rejectProvider(accessToken: string, providerId: string, note?: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'reject', 'Nie udało się odrzucić placówki.', note ? { note } : undefined);
}

export function requestProviderChanges(accessToken: string, providerId: string, note?: string): Promise<AdminProviderDto> {
  return postProviderDecision(accessToken, providerId, 'request-changes', 'Nie udało się wysłać prośby o uzupełnienie.', note ? { note } : undefined);
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
