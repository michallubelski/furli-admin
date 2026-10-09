import { apiRequest, ApiClientError } from '../../../shared/api/client';

// furli-backend's shop order desk (order.api.AdminShopOrderController): every order with its status
// counts, one order with its history and the statuses it may move to, and moving it on (the customer
// is emailed about every change).

export type OrderStatus = 'AWAITING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'NOT_CHARGED' | 'PENDING' | 'PAID';
export type DeliveryMethod = 'INPOST_LOCKER' | 'INPOST_COURIER' | 'DPD_COURIER';

export const ORDER_STATUSES: OrderStatus[] = ['AWAITING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// The admin list's tabs: the work first (new, being packed, on the way), then the rest.
export type OrderTab = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'AWAITING_PAYMENT' | 'ALL';
export const ORDER_TABS: OrderTab[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'AWAITING_PAYMENT', 'ALL'];

/** Fired after an order changed, so the sidebar's count of new orders follows. */
export const ORDERS_CHANGED_EVENT = 'furli-admin:orders-changed';

export interface AdminOrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  totalMinor: number;
  itemCount: number;
  buyerName: string;
  email: string;
  guest: boolean;
  deliveryMethod: DeliveryMethod;
  carrier: 'INPOST' | 'DPD';
  pickupPointCode: string | null;
  city: string;
}

export interface AdminOrderPage {
  content: AdminOrderRow[];
  counts: Record<OrderStatus, number>;
  all: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminOrder {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'BLIK' | 'CARD';
  placedAt: string;
  buyer: { firstName: string; lastName: string; email: string; phone: string; street: string; postalCode: string; city: string };
  delivery: {
    method: DeliveryMethod;
    carrier: 'INPOST' | 'DPD';
    priceMinor: number;
    pickupPoint: { code: string; address: string | null; description: string | null; hours: string | null } | null;
    trackingNumber: string | null;
  };
  lines: Array<{ productId: string; name: string; brand: string | null; imageUrl: string | null; unitPriceMinor: number; quantity: number; lineTotalMinor: number }>;
  itemsTotalMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  currency: string;
  cancellationReason: string | null;
}

export interface AdminOrderDetail {
  order: AdminOrder;
  customerAccountId: string | null;
  termsVersion: string;
  termsAcceptedAt: string;
  marketingConsent: boolean;
  statusChanges: Array<{ fromStatus: OrderStatus | null; toStatus: OrderStatus; changedAt: string; changedByAdminId: string | null; note: string | null }>;
  allowedNextStatuses: OrderStatus[];
}

export interface StatusChange {
  status: OrderStatus;
  trackingNumber?: string;
  note?: string;
}

function required<T>(data: T | null, fallback: string): T {
  if (data === null) throw new ApiClientError(500, fallback);
  return data;
}

export async function listOrders(token: string, query: { tab: OrderTab; q?: string; page?: number; size?: number }): Promise<AdminOrderPage> {
  const params = new URLSearchParams({ page: String(query.page ?? 0), size: String(query.size ?? 25) });
  if (query.tab !== 'ALL') params.set('status', query.tab);
  if (query.q?.trim()) params.set('q', query.q.trim());
  return required(await apiRequest<AdminOrderPage>(`/api/admin/shop/orders?${params.toString()}`, { token, fallbackMessage: 'Nie udało się pobrać zamówień.' }), 'Nie udało się pobrać zamówień.');
}

export async function getOrder(token: string, orderId: string): Promise<AdminOrderDetail> {
  return required(await apiRequest<AdminOrderDetail>(`/api/admin/shop/orders/${encodeURIComponent(orderId)}`, { token, fallbackMessage: 'Nie udało się pobrać zamówienia.' }), 'Nie udało się pobrać zamówienia.');
}

export async function changeOrderStatus(token: string, orderId: string, change: StatusChange): Promise<AdminOrderDetail> {
  return required(await apiRequest<AdminOrderDetail>(`/api/admin/shop/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'POST',
    token,
    body: change,
    fallbackMessage: 'Nie udało się zmienić statusu zamówienia.',
  }), 'Nie udało się zmienić statusu zamówienia.');
}

export function formatMinor(minor: number): string {
  return `${(minor / 100).toFixed(2).replace('.', ',')} zł`;
}
