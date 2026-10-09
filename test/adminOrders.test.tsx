import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrderDetail, AdminOrderPage, AdminOrderRow } from '../src/features/admin/orders/api';

// "Zamówienia sklepu": new orders first, an order opens with its products, buyer, delivery and
// history, and moves on only to the statuses the backend allows; cancelling needs a reason.

const api = vi.hoisted(() => ({ listOrders: vi.fn(), getOrder: vi.fn(), changeOrderStatus: vi.fn() }));
vi.mock('../src/features/admin/orders/api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const showNotice = vi.fn();
vi.mock('../src/features/admin/context', () => ({ useAdminState: () => ({ accessToken: 'token', showNotice }) }));

const { AdminOrdersPage } = await import('../src/features/admin/orders/OrdersPage');
const { I18nProvider } = await import('../src/shared/i18n');

const row: AdminOrderRow = {
  id: 'o1', number: 'FS-2026-000012', status: 'CONFIRMED', paymentStatus: 'NOT_CHARGED', placedAt: '2026-10-09T10:28:00Z', totalMinor: 3031,
  itemCount: 2, buyerName: 'Anna Nowak', email: 'anna@example.pl', guest: true, deliveryMethod: 'INPOST_LOCKER', carrier: 'INPOST', pickupPointCode: 'KIE01M', city: 'Kielce',
};
const page: AdminOrderPage = {
  content: [row],
  counts: { AWAITING_PAYMENT: 0, CONFIRMED: 1, PROCESSING: 2, SHIPPED: 0, DELIVERED: 5, CANCELLED: 0 },
  all: 8, page: 0, size: 25, totalElements: 1, totalPages: 1, last: true,
};
const detail: AdminOrderDetail = {
  order: {
    id: 'o1', number: 'FS-2026-000012', status: 'CONFIRMED', paymentStatus: 'NOT_CHARGED', paymentMethod: 'BLIK', placedAt: '2026-10-09T10:28:00Z',
    buyer: { firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.pl', phone: '+48 600100200', street: 'Okrzei 50', postalCode: '25-526', city: 'Kielce' },
    delivery: { method: 'INPOST_LOCKER', carrier: 'INPOST', priceMinor: 1299, pickupPoint: { code: 'KIE01M', address: 'Okrzei 48, 25-526 Kielce', description: null, hours: '24/7' }, trackingNumber: null },
    lines: [{ productId: 'EAN-1', name: "Hill's PD Feline C/D", brand: "Hill's", imageUrl: null, unitPriceMinor: 866, quantity: 2, lineTotalMinor: 1732 }],
    itemsTotalMinor: 1732, deliveryMinor: 1299, totalMinor: 3031, currency: 'PLN', cancellationReason: null,
  },
  customerAccountId: null,
  termsVersion: 'v1',
  termsAcceptedAt: '2026-10-09T10:28:00Z',
  marketingConsent: false,
  statusChanges: [{ fromStatus: null, toStatus: 'CONFIRMED', changedAt: '2026-10-09T10:28:00Z', changedByAdminId: null, note: null }],
  allowedNextStatuses: ['CANCELLED', 'PROCESSING'],
};

function renderPage(path = '/orders') {
  return render(<I18nProvider><MemoryRouter initialEntries={[path]}><AdminOrdersPage /></MemoryRouter></I18nProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('furli.locale', 'pl-PL');
  api.listOrders.mockResolvedValue(page);
  api.getOrder.mockResolvedValue(detail);
});

describe('Zamówienia sklepu', () => {
  it('lists new orders first with every status counted, and opens one', async () => {
    const user = userEvent.setup();
    renderPage();

    const orderRow = await screen.findByRole('button', { name: /FS-2026-000012/ });
    expect(api.listOrders).toHaveBeenCalledWith('token', expect.objectContaining({ tab: 'CONFIRMED' }));
    expect(within(orderRow).getByText('Anna Nowak')).toBeInTheDocument();
    expect(within(orderRow).getByText('30,31 zł')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /W realizacji\s*2/ })).toBeInTheDocument();

    await user.click(orderRow);
    expect(await screen.findByText('Zamówienie FS-2026-000012')).toBeInTheDocument();
    expect(screen.getByText(/KIE01M · Okrzei 48, 25-526 Kielce/)).toBeInTheDocument();
    expect(screen.getByText('Zamówienie bez konta')).toBeInTheDocument();
  });

  it('moves the order on and tells that the customer was emailed', async () => {
    const user = userEvent.setup();
    api.changeOrderStatus.mockResolvedValue({ ...detail, order: { ...detail.order, status: 'PROCESSING' }, allowedNextStatuses: ['SHIPPED', 'CANCELLED'] });
    renderPage('/orders?orderId=o1');

    // Forward first, cancelling last.
    const actions = (await screen.findByRole('button', { name: 'Rozpocznij realizację' })).parentElement!;
    expect(within(actions).getAllByRole('button').map((button) => button.textContent)).toEqual(['Rozpocznij realizację', 'Anuluj zamówienie']);

    await user.click(screen.getByRole('button', { name: 'Rozpocznij realizację' }));
    expect(screen.getByText('Klient dostanie e-mail o nowym statusie.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zmień status' }));

    expect(api.changeOrderStatus).toHaveBeenCalledWith('token', 'o1', { status: 'PROCESSING' });
    expect(showNotice).toHaveBeenCalledWith('Zamówienie FS-2026-000012 ma status: W realizacji. Klient dostał e-mail.');
  });

  it('cancels only with a reason the customer will see', async () => {
    const user = userEvent.setup();
    api.changeOrderStatus.mockResolvedValue({ ...detail, order: { ...detail.order, status: 'CANCELLED' }, allowedNextStatuses: [] });
    renderPage('/orders?orderId=o1');

    await user.click(await screen.findByRole('button', { name: 'Anuluj zamówienie' }));
    await user.click(screen.getByRole('button', { name: 'Zmień status' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Podaj powód anulowania.');
    expect(api.changeOrderStatus).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Powód anulowania (zobaczy go klient)'), 'Brak towaru u dostawcy');
    await user.click(screen.getByRole('button', { name: 'Zmień status' }));
    expect(api.changeOrderStatus).toHaveBeenCalledWith('token', 'o1', { status: 'CANCELLED', note: 'Brak towaru u dostawcy' });
  });
});
