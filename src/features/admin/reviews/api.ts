import { apiRequest, ApiClientError } from '../../../shared/api/client';

// furli-backend's review moderation (review.api.AdminReviewController): the list with tabs and
// filters, one review's reports and history, the moderation actions and the review time limits.

export type ReviewTab = 'reported' | 'published' | 'hidden' | 'withdrawn' | 'all';
export type ModerationCategory = 'OFFENSIVE' | 'PERSONAL_DATA' | 'SPAM' | 'NOT_ABOUT_VISIT' | 'FAKE' | 'OTHER';
export const MODERATION_CATEGORIES: ModerationCategory[] = ['OFFENSIVE', 'PERSONAL_DATA', 'SPAM', 'NOT_ABOUT_VISIT', 'FAKE', 'OTHER'];

export interface AdminReview {
  id: string;
  providerId: string;
  providerName: string;
  author: string;
  rating: number;
  text: string | null;
  staffName: string | null;
  staffRating: number | null;
  staffText: string | null;
  service: string | null;
  visitDate: string;
  createdAt: string;
  editedAt: string | null;
  status: 'PUBLISHED' | 'HIDDEN' | 'WITHDRAWN';
  reply: { text: string; repliedAt: string; edited: boolean } | null;
  replyHidden: boolean;
  replyModerationCategory: ModerationCategory | null;
  openReports: number;
  moderationCategory: ModerationCategory | null;
  moderationNote: string | null;
}

export interface AdminReviewPage {
  counts: { reported: number; published: number; hidden: number; withdrawn: number; all: number };
  items: AdminReview[];
  page: number;
  size: number;
  total: number;
}

export interface AdminReviewDetail {
  review: AdminReview;
  bookingId: string;
  reports: Array<{ id: string; reporterName: string | null; category: ModerationCategory; note: string | null; status: 'OPEN' | 'UPHELD' | 'DISMISSED' | 'CLOSED'; createdAt: string; decidedAt: string | null }>;
  history: Array<{ type: string; actor: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'; actorName: string | null; category: ModerationCategory | null; note: string | null; createdAt: string }>;
}

export interface ReviewPolicy {
  writeWindowDays: number;
  editWindowDays: number;
  replyWindowDays: number | null;
  updatedAt: string | null;
}

export interface ReviewQuery {
  tab: ReviewTab;
  q?: string;
  rating?: number | null;
  hasReply?: boolean | null;
  page?: number;
  size?: number;
}

function required<T>(data: T | null, fallback: string): T {
  if (data === null) throw new ApiClientError(500, fallback);
  return data;
}

export async function listReviews(token: string, query: ReviewQuery): Promise<AdminReviewPage> {
  const params = new URLSearchParams({ tab: query.tab, page: String(query.page ?? 0), size: String(query.size ?? 25) });
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.rating) params.set('rating', String(query.rating));
  if (query.hasReply != null) params.set('hasReply', String(query.hasReply));
  return required(await apiRequest<AdminReviewPage>(`/api/admin/reviews?${params.toString()}`, { token, fallbackMessage: 'Nie udało się pobrać opinii.' }), 'Nie udało się pobrać opinii.');
}

export async function getReviewDetail(token: string, reviewId: string): Promise<AdminReviewDetail> {
  return required(await apiRequest<AdminReviewDetail>(`/api/admin/reviews/${reviewId}`, { token, fallbackMessage: 'Nie udało się pobrać opinii.' }), 'Nie udało się pobrać opinii.');
}

type Action = 'keep' | 'hide' | 'restore' | 'reply/hide' | 'reply/restore';

export async function moderateReview(token: string, reviewId: string, action: Action, body?: { category?: ModerationCategory; note?: string }): Promise<AdminReviewDetail> {
  return required(await apiRequest<AdminReviewDetail>(`/api/admin/reviews/${reviewId}/${action}`, {
    method: 'POST',
    token,
    body: body ?? {},
    fallbackMessage: 'Nie udało się zapisać decyzji.',
  }), 'Nie udało się zapisać decyzji.');
}

export async function getReviewPolicy(token: string): Promise<ReviewPolicy> {
  return required(await apiRequest<ReviewPolicy>('/api/admin/review-policy', { token, fallbackMessage: 'Nie udało się pobrać zasad opinii.' }), 'Nie udało się pobrać zasad opinii.');
}

export async function saveReviewPolicy(token: string, policy: Omit<ReviewPolicy, 'updatedAt'>): Promise<ReviewPolicy> {
  return required(await apiRequest<ReviewPolicy>('/api/admin/review-policy', {
    method: 'PUT',
    token,
    body: policy,
    fallbackMessage: 'Nie udało się zapisać zasad opinii.',
  }), 'Nie udało się zapisać zasad opinii.');
}

/** The sidebar badge and the decision queue refresh when a moderation decision changes the counts. */
export const REVIEWS_CHANGED_EVENT = 'furli:admin-reviews-changed';
