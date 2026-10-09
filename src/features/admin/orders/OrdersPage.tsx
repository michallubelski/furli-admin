import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError } from '../../../shared/api/client';
import { Card, useIsMobile } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_HEAD, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { Search } from '../../../shared/icons';
import { useAdminState } from '../context';
import { adminActionButtonStyle } from '../model';
import { AdminBadge, EmptyState, TabButton } from '../components/shared';
import {
  changeOrderStatus,
  formatMinor,
  getOrder,
  listOrders,
  ORDER_TABS,
  ORDERS_CHANGED_EVENT,
  type AdminOrderDetail,
  type AdminOrderPage,
  type AdminOrderRow,
  type OrderStatus,
  type OrderTab,
} from './api';

// "Zamówienia sklepu": the shop's order desk. New orders first (to pack), every order opens with
// its products, buyer, delivery and history, and moves on one status at a time - the backend allows
// only the next steps (`allowedNextStatuses`) and emails the customer about each one.

const PAGE_SIZE = 25;

const STATUS_LOOK: Record<OrderStatus, { color: string; background: string }> = {
  AWAITING_PAYMENT: { color: C.amber, background: 'oklch(0.95 0.05 85)' },
  CONFIRMED: { color: C.amber, background: 'oklch(0.94 0.06 80)' },
  PROCESSING: { color: C.textMedium, background: C.bgMuted },
  SHIPPED: { color: C.tealDark, background: C.tealLight },
  DELIVERED: { color: C.green, background: C.greenLight },
  CANCELLED: { color: C.textMuted, background: C.bgMuted },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <AdminBadge label={t(`admin.orders.status.${status}`)} {...STATUS_LOOK[status]} />;
}

export function AdminOrdersPage() {
  const { t, formatDateTime } = useI18n();
  const { accessToken, showNotice } = useAdminState();
  const isMobile = useIsMobile(1100);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<OrderTab>('CONFIRMED');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [data, setData] = useState<AdminOrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const selectedId = params.get('orderId');

  const errorText = useCallback((failure: unknown, fallback: string) => (failure instanceof ApiClientError ? failure.message : fallback), []);

  const load = useCallback(async (page = 0) => {
    setLoading(true);
    setError('');
    try {
      const result = await listOrders(accessToken, { tab, q: appliedQuery, page, size: PAGE_SIZE });
      setData((current) => (page === 0 || !current ? result : { ...result, content: [...current.content, ...result.content] }));
    } catch (failure) {
      setError(errorText(failure, t('admin.orders.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [accessToken, tab, appliedQuery, errorText, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getOrder(accessToken, selectedId)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((failure) => { if (!cancelled) showNotice(errorText(failure, t('admin.orders.loadFailed')), 'error'); });
    return () => { cancelled = true; };
  }, [accessToken, selectedId, errorText, showNotice, t]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('orderId', id);
    else next.delete('orderId');
    setParams(next, { replace: true });
  };

  const counts = data?.counts;
  const countOf = (item: OrderTab) => (!data ? undefined : item === 'ALL' ? data.all : counts?.[item]);

  const filters = (
    <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
      <div role="tablist" aria-label={t('admin.orders.tabsLabel')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {ORDER_TABS.map((item) => (
          <TabButton key={item} active={tab === item} label={t(`admin.orders.tabs.${item}`)} count={countOf(item)} onClick={() => setTab(item)} />
        ))}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 420, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 10px', background: C.bgCard }}>
        <Search size={14} color={C.textMuted} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => setAppliedQuery(query)} placeholder={t('admin.orders.searchPlaceholder')} aria-label={t('admin.orders.searchPlaceholder')} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', fontSize: 13, fontFamily: FONT_BODY, color: C.text }} />
      </form>
    </div>
  );

  const list = (
    <div style={{ display: 'grid', gap: 10 }}>
      {error ? <Card style={{ padding: 14 }}><div role="alert" style={{ color: C.roseDark, fontSize: 13 }}>{error}</div></Card> : null}
      {loading && !data ? <Card style={{ padding: 18, fontSize: 13, color: C.textMuted }}>{t('admin.orders.loading')}</Card> : null}
      {data && data.content.length === 0 && !loading ? <EmptyState title={t(`admin.orders.empty.${tab}`)} description={t('admin.orders.emptyDescription')} /> : null}
      {data?.content.map((order) => (
        <OrderRow key={order.id} order={order} active={order.id === selectedId} onSelect={() => select(order.id)} formatDateTime={formatDateTime} />
      ))}
      {data && data.content.length < data.totalElements ? (
        <button type="button" onClick={() => void load(data.page + 1)} disabled={loading} style={{ ...adminActionButtonStyle.subtle, justifyContent: 'center' }}>{t('admin.orders.showMore')}</button>
      ) : null}
    </div>
  );

  const detailPanel = detail ? (
    <OrderDetailPanel
      key={`${detail.order.id}-${detail.order.status}`}
      detail={detail}
      onClose={() => select(null)}
      onChange={async (change) => {
        try {
          const result = await changeOrderStatus(accessToken, detail.order.id, change);
          setDetail(result);
          showNotice(t('admin.orders.statusChanged', { number: result.order.number, status: t(`admin.orders.status.${result.order.status}`) }));
          window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
          void load();
          return true;
        } catch (failure) {
          showNotice(errorText(failure, t('admin.orders.statusChangeFailed')), 'error');
          return false;
        }
      }}
    />
  ) : (
    <Card style={{ padding: 22, fontSize: 13, color: C.textMuted }}>{t('admin.orders.selectHint')}</Card>
  );

  return (
    <div>
      {filters}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 14 }}>{detail ? detailPanel : list}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 16, alignItems: 'start' }}>
          {list}
          <div style={{ position: 'sticky', top: 16 }}>{detailPanel}</div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, active, onSelect, formatDateTime }: { order: AdminOrderRow; active: boolean; onSelect: () => void; formatDateTime: (value: string) => string }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined} style={{ textAlign: 'left', padding: 14, borderRadius: 14, border: `1px solid ${active ? C.primary : C.border}`, background: active ? 'oklch(0.97 0.03 80)' : C.bgCard, cursor: 'pointer', fontFamily: FONT_BODY, color: C.text, display: 'grid', gap: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ fontFamily: FONT_NUM, fontSize: 14 }}>{order.number}</b>
        <span style={{ marginLeft: 'auto' }}><OrderStatusBadge status={order.status} /></span>
      </span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13.5 }}>{order.buyerName}</b>
        <span style={{ fontSize: 12, color: C.textMuted }}>{order.email}{order.guest ? ` · ${t('admin.orders.guest')}` : ''}</span>
        <b style={{ marginLeft: 'auto', fontFamily: FONT_NUM, fontSize: 14 }}>{formatMinor(order.totalMinor)}</b>
      </span>
      <span style={{ fontSize: 12, color: C.textMuted }}>
        {formatDateTime(order.placedAt)} · {t('admin.orders.items', { count: order.itemCount })} · {t(`admin.orders.delivery.${order.deliveryMethod}`)}{order.pickupPointCode ? ` ${order.pickupPointCode}` : ` · ${order.city}`}
      </span>
    </button>
  );
}

function OrderDetailPanel({ detail, onClose, onChange }: {
  detail: AdminOrderDetail;
  onClose: () => void;
  onChange: (change: { status: OrderStatus; trackingNumber?: string; note?: string }) => Promise<boolean>;
}) {
  const { t, formatDateTime } = useI18n();
  const { order, statusChanges, allowedNextStatuses } = detail;
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const point = order.delivery.pickupPoint;
  // The way forward first, cancelling last.
  const nextStatuses = [...allowedNextStatuses].sort((a, b) => Number(a === 'CANCELLED') - Number(b === 'CANCELLED'));
  const reasonMissing = target === 'CANCELLED' && !note.trim();

  const pick = (status: OrderStatus) => {
    setTarget(status);
    setTrackingNumber('');
    setNote('');
    setTried(false);
  };

  const submit = async () => {
    setTried(true);
    if (!target || reasonMissing) return;
    setBusy(true);
    const done = await onChange({
      status: target,
      ...(target === 'SHIPPED' && trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setBusy(false);
    if (done) setTarget(null);
  };

  const section = { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: C.textMuted, margin: '18px 0 8px' };
  const muted = { fontSize: 12, color: C.textMuted };
  const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: FONT_BODY, fontWeight: 400, color: C.text, background: C.bgCard };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700 }}>{t('admin.orders.orderTitle', { number: order.number })}</div>
          <div style={{ ...muted, marginTop: 3 }}>{formatDateTime(order.placedAt)} · {formatMinor(order.totalMinor)}</div>
        </div>
        <OrderStatusBadge status={order.status} />
        <button type="button" onClick={onClose} aria-label={t('common.actions.close')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.textMuted, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={section}>{t('admin.orders.statusSection')}</div>
      {nextStatuses.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textSecondary }}>{t('admin.orders.final')}</div>
      ) : target ? (
        <div style={{ display: 'grid', gap: 10, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t('admin.orders.changeTo', { status: t(`admin.orders.status.${target}`) })}</div>
          {target === 'SHIPPED' ? (
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>
              {t('admin.orders.trackingLabel')}
              <input value={trackingNumber} maxLength={64} onChange={(event) => setTrackingNumber(event.target.value)} style={inputStyle} />
            </label>
          ) : null}
          <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>
            {target === 'CANCELLED' ? t('admin.orders.reasonLabel') : t('admin.orders.noteLabel')}
            <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} aria-invalid={tried && reasonMissing} style={{ ...inputStyle, border: `1px solid ${tried && reasonMissing ? C.roseDark : C.border}`, minHeight: 60, resize: 'vertical' }} />
          </label>
          <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{t(target === 'CANCELLED' ? 'admin.orders.cancelHint' : target === 'SHIPPED' ? 'admin.orders.shipHint' : 'admin.orders.emailHint')}</div>
          {tried && reasonMissing ? <div role="alert" style={{ fontSize: 12, color: C.roseDark }}>{t('admin.orders.reasonRequired')}</div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setTarget(null)} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
            <button type="button" onClick={() => void submit()} disabled={busy} style={{ ...adminActionButtonStyle.primary, background: target === 'CANCELLED' ? C.roseDark : C.text, opacity: busy ? 0.7 : 1 }}>
              {t('admin.orders.confirmChange')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => pick(status)}
              style={status === 'CANCELLED'
                ? { ...adminActionButtonStyle.subtle, color: C.roseDark }
                : adminActionButtonStyle.primary}
            >
              {t(`admin.orders.actions.${status}`)}
            </button>
          ))}
        </div>
      )}

      <div style={section}>{t('admin.orders.productsSection')}</div>
      <div style={{ display: 'grid', gap: 0 }}>
        {order.lines.map((line) => (
          <div key={line.productId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, lineHeight: 1.35 }}>{line.name}</span>
              <span style={{ ...muted, display: 'block', marginTop: 2 }}>{line.brand ? `${line.brand} · ` : ''}{line.productId} · {line.quantity} × {formatMinor(line.unitPriceMinor)}</span>
            </span>
            <b style={{ fontFamily: FONT_NUM, whiteSpace: 'nowrap' }}>{formatMinor(line.lineTotalMinor)}</b>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'grid', gap: 3, fontSize: 12.5, color: C.textSecondary }}>
          <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin.orders.itemsTotal')}</span><span style={{ fontFamily: FONT_NUM }}>{formatMinor(order.itemsTotalMinor)}</span></span>
          <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin.orders.deliveryCost')}</span><span style={{ fontFamily: FONT_NUM }}>{order.deliveryMinor === 0 ? t('admin.orders.free') : formatMinor(order.deliveryMinor)}</span></span>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: C.text, fontSize: 14 }}><span>{t('admin.orders.total')}</span><span style={{ fontFamily: FONT_NUM }}>{formatMinor(order.totalMinor)}</span></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div>
          <div style={section}>{t('admin.orders.buyerSection')}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{order.buyer.firstName} {order.buyer.lastName}</div>
          <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>
            <a href={`mailto:${order.buyer.email}`} style={{ color: C.textSecondary }}>{order.buyer.email}</a><br />
            <a href={`tel:${order.buyer.phone.replace(/\s/g, '')}`} style={{ color: C.textSecondary }}>{order.buyer.phone}</a><br />
            {order.buyer.street}, {order.buyer.postalCode} {order.buyer.city}
          </div>
          <div style={{ ...muted, marginTop: 6 }}>
            {detail.customerAccountId ? t('admin.orders.account') : t('admin.orders.guestOrder')}
            {detail.marketingConsent ? ` · ${t('admin.orders.marketingConsent')}` : ''}
          </div>
        </div>
        <div>
          <div style={section}>{t('admin.orders.deliverySection')}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t(`admin.orders.delivery.${order.delivery.method}`)}</div>
          <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>
            {point ? (
              <>
                {point.code}{point.address ? ` · ${point.address}` : ''}
                {point.hours || point.description ? <><br />{[point.hours, point.description].filter(Boolean).join(' · ')}</> : null}
              </>
            ) : (
              <>{order.buyer.street}, {order.buyer.postalCode} {order.buyer.city}</>
            )}
          </div>
          {order.delivery.trackingNumber ? <div style={{ ...muted, marginTop: 6 }}>{t('admin.orders.trackingShort')} <b style={{ color: C.text, fontFamily: FONT_NUM }}>{order.delivery.trackingNumber}</b></div> : null}
          <div style={section}>{t('admin.orders.paymentSection')}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t(`admin.orders.payment.${order.paymentMethod}`)}</div>
          <div style={{ ...muted, marginTop: 3 }}>{t(`admin.orders.paymentStatus.${order.paymentStatus}`)}</div>
        </div>
      </div>

      <div style={section}>{t('admin.orders.historySection')}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {[...statusChanges].reverse().map((change, index) => (
          <li key={`${change.changedAt}-${index}`} style={{ display: 'grid', gap: 2, fontSize: 12.5, borderLeft: `2px solid ${index === 0 ? C.primary : C.border}`, paddingLeft: 10 }}>
            <span><b>{t(`admin.orders.status.${change.toStatus}`)}</b> <span style={muted}>· {formatDateTime(change.changedAt)} · {change.changedByAdminId ? t('admin.orders.byAdmin') : t('admin.orders.byShop')}</span></span>
            {change.note ? <span style={{ color: C.textSecondary, lineHeight: 1.5 }}>{change.note}</span> : null}
          </li>
        ))}
      </ol>
      <div style={{ ...muted, marginTop: 14 }}>{t('admin.orders.terms', { version: detail.termsVersion, date: formatDateTime(detail.termsAcceptedAt) })}</div>
    </Card>
  );
}
