import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminReview, AdminReviewDetail, AdminReviewPage } from '../src/features/admin/reviews/api';

// Review moderation: reported reviews first, a review opens with its reports and history, hiding
// needs a reason and an explanation, keeping dismisses the reports; the time limits are set here.

const api = vi.hoisted(() => ({
  listReviews: vi.fn(),
  getReviewDetail: vi.fn(),
  moderateReview: vi.fn(),
  getReviewPolicy: vi.fn(),
  saveReviewPolicy: vi.fn(),
}));
vi.mock('../src/features/admin/reviews/api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const showToast = vi.fn();
vi.mock('../src/features/admin/context', () => ({ useAdminState: () => ({ accessToken: 'token', showToast }) }));

const { AdminReviewsPage } = await import('../src/features/admin/reviews/ReviewsPage');
const { I18nProvider } = await import('../src/shared/i18n');

const review: AdminReview = {
  id: 'r1', providerId: 'p1', providerName: 'Przychodnia Łapa', author: 'Marta K.', rating: 1, text: 'Tu jest numer 600 100 200.',
  staffName: null, staffRating: null, staffText: null, service: 'Konsultacja', visitDate: '2026-09-01', createdAt: '2026-09-02T10:00:00Z',
  editedAt: null, status: 'PUBLISHED', reply: null, replyHidden: false, replyModerationCategory: null, openReports: 1, moderationCategory: null, moderationNote: null,
};
const page: AdminReviewPage = { counts: { reported: 1, published: 4, hidden: 0, withdrawn: 0, all: 4 }, items: [review], page: 0, size: 25, total: 1 };
const detail: AdminReviewDetail = {
  review,
  bookingId: 'b1',
  reports: [{ id: 'rep1', reporterName: 'Przychodnia Łapa', category: 'PERSONAL_DATA', note: 'Prywatny numer.', status: 'OPEN', createdAt: '2026-09-03T10:00:00Z', decidedAt: null }],
  history: [
    { type: 'CREATED', actor: 'CUSTOMER', actorName: 'Marta K.', category: null, note: null, createdAt: '2026-09-02T10:00:00Z' },
    { type: 'REPORTED', actor: 'PROVIDER', actorName: 'Przychodnia Łapa', category: 'PERSONAL_DATA', note: 'Prywatny numer.', createdAt: '2026-09-03T10:00:00Z' },
  ],
};

function lastButton(name: string) {
  const buttons = screen.getAllByRole('button', { name });
  return buttons[buttons.length - 1];
}

function renderPage(path = '/reviews') {
  return render(<I18nProvider><MemoryRouter initialEntries={[path]}><AdminReviewsPage /></MemoryRouter></I18nProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('furli.locale', 'pl-PL');
  api.listReviews.mockResolvedValue(page);
  api.getReviewDetail.mockResolvedValue(detail);
});

describe('Opinie - moderacja', () => {
  it('lists reported reviews first and opens one with its reports and history', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Przychodnia Łapa')).toBeInTheDocument();
    expect(api.listReviews).toHaveBeenCalledWith('token', expect.objectContaining({ tab: 'reported' }));
    expect(screen.getByRole('button', { name: 'Zgłoszone (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tu jest numer/ }));
    expect(await screen.findByText('Prywatny numer.', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Zgłoszona przez placówkę')).toBeInTheDocument();
  });

  it('hides a review only with a reason and an explanation', async () => {
    const user = userEvent.setup();
    api.moderateReview.mockResolvedValue({ ...detail, review: { ...review, status: 'HIDDEN', openReports: 0, moderationCategory: 'PERSONAL_DATA' } });
    renderPage('/reviews?reviewId=r1');

    await user.click(await screen.findByRole('button', { name: 'Ukryj opinię' }));
    await user.click(lastButton('Ukryj opinię'));
    expect(screen.getByRole('alert')).toHaveTextContent('Dodaj uzasadnienie.');
    expect(api.moderateReview).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Uzasadnienie'), 'Numer telefonu osoby prywatnej.');
    await user.click(lastButton('Ukryj opinię'));
    expect(api.moderateReview).toHaveBeenCalledWith('token', 'r1', 'hide', { category: 'PERSONAL_DATA', note: 'Numer telefonu osoby prywatnej.' });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Opinia ukryta. Autor i placówka zostali powiadomieni.'));
  });

  it('keeps a reported review', async () => {
    const user = userEvent.setup();
    api.moderateReview.mockResolvedValue({ ...detail, review: { ...review, openReports: 0 } });
    renderPage('/reviews?reviewId=r1');

    await user.click(await screen.findByRole('button', { name: 'Zostaw opinię' }));
    expect(api.moderateReview).toHaveBeenCalledWith('token', 'r1', 'keep', {});
  });

  it('sets the time limits, with no limit for replies', async () => {
    const user = userEvent.setup();
    api.getReviewPolicy.mockResolvedValue({ writeWindowDays: 30, editWindowDays: 14, replyWindowDays: null, updatedAt: null });
    api.saveReviewPolicy.mockResolvedValue({ writeWindowDays: 21, editWindowDays: 7, replyWindowDays: 60, updatedAt: '2026-09-30T10:00:00Z' });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Zasady i terminy/ }));
    const write = await screen.findByLabelText(/Czas na wystawienie opinii/);
    await user.clear(write);
    await user.type(write, '400');
    await user.click(screen.getByRole('button', { name: 'Zapisz zasady' }));
    expect(screen.getByRole('alert')).toHaveTextContent('od 1 do 365 dni');
    expect(api.saveReviewPolicy).not.toHaveBeenCalled();

    await user.clear(write);
    await user.type(write, '21');
    const edit = screen.getByLabelText(/Czas na edycję opinii/);
    await user.clear(edit);
    await user.type(edit, '7');
    await user.click(screen.getByLabelText('Bez limitu'));
    const reply = screen.getByLabelText(/Czas na odpowiedź placówki/);
    await user.clear(reply);
    await user.type(reply, '60');
    await user.click(screen.getByRole('button', { name: 'Zapisz zasady' }));
    expect(api.saveReviewPolicy).toHaveBeenCalledWith('token', { writeWindowDays: 21, editWindowDays: 7, replyWindowDays: 60 });
    expect(within(document.body).queryByRole('alert')).not.toBeInTheDocument();
  });
});
