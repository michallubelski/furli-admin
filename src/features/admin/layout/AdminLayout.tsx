import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Clock, LayoutDashboard, LogOut, Menu, ShieldCheck, Store } from '../../../shared/icons';
import type { IconComponent } from '../../../shared/types/furli';
import { useIsMobile } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_HEAD, shadow } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { buildAdminNav, buildAdminPageMeta } from '../../../app/routes';
import type { AdminRouteKey } from '../../../shared/types/furli';
import { useAdminState } from '../context';

// No `/admin` prefix here - furli-admin is its own standalone app mounted at the domain root
// (admin.furliplus.pl), unlike furli-fronted where this same file lived under a `/admin/*`
// sub-route of a multi-role app.
function resolveAdminRouteKey(pathname: string): AdminRouteKey {
  if (pathname.startsWith('/queue')) return 'queue';
  if (pathname.startsWith('/verification')) return 'verification';
  if (pathname.startsWith('/providers')) return 'providers';
  if (pathname.startsWith('/subscriptions')) return 'subscriptions';
  if (pathname.startsWith('/reviews')) return 'reviews';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/api-integrations')) return 'apiIntegrations';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/catalog')) return 'catalog';
  if (pathname.startsWith('/communication')) return 'communication';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admins')) return 'admins';
  if (pathname.startsWith('/more')) return 'more';
  return 'dashboard';
}

// v44 (mobile): bottom tab bar replacing the drawer entirely - Pulpit/Kolejka/Placówki stay one
// tap away, everything else lives behind "Więcej" (mockup furli-admin-v6.jsx:1940-1945, its own
// comment there: "Placówki zostają pod kciukiem... decyzja zatwierdzona przy akceptacji makiety").
const MOBILE_TABS: Array<{ routeKey: AdminRouteKey; path: string; Icon: IconComponent }> = [
  { routeKey: 'dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { routeKey: 'queue', path: '/queue', Icon: ShieldCheck },
  { routeKey: 'providers', path: '/providers', Icon: Store },
  { routeKey: 'more', path: '/more', Icon: Menu },
];

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pendingVerificationCount, toast } = useAdminState();
  const navSections = useMemo(() => buildAdminNav(t), [t]);
  const routeKey = useMemo(() => resolveAdminRouteKey(location.pathname), [location.pathname]);
  const pageMeta = useMemo(() => buildAdminPageMeta(t)[routeKey], [t, routeKey]);
  // "Więcej" is also the fallback landing spot for any screen that isn't a direct tab (mirrors the
  // mockup's own `!MOBILE_TABS.some((t) => t.id === screen)` check, mockup lines 2182/2239) - both
  // the header's back-chevron and the tab bar's own highlight use this.
  const isDirectTab = MOBILE_TABS.some((tab) => tab.routeKey === routeKey);

  return (
    <div className="furli-admin-root" style={{ width: '100%', minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        .furli-admin-panel input:focus, .furli-admin-panel textarea:focus, .furli-admin-panel select:focus { outline: 2px solid oklch(0.72 0.12 75 / 0.45); }
        .furli-admin-main::-webkit-scrollbar { width: 10px; }
        .furli-admin-main::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 6px; }
        @keyframes furliRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes furliSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (max-width: 860px) {
          /* v44 (mockup furli-admin-v6.jsx:2115-2130): every inline grid collapses to one column,
             tables scroll horizontally instead of squeezing columns, modals become bottom sheets,
             form fields go to 16px (iOS auto-zooms a focused input below that), and buttons get a
             38px minimum tap target. Matches the mockup's own approach of an attribute selector on
             the rendered style string rather than threading isMobile through every page that
             happens to use a grid - React still renders inline styles to a real style attribute,
             so this works identically to the mockup's plain-HTML version. */
          .furli-admin-root [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .furli-admin-root table { display: block; overflow-x: auto; white-space: nowrap; }
          .furli-admin-root .furli-sheet-back { align-items: flex-end !important; padding: 0 !important; }
          .furli-admin-root .furli-sheet-back > div {
            width: 100% !important; max-width: 100% !important; max-height: 90vh !important;
            border-radius: 22px 22px 0 0 !important; overflow-y: auto;
            animation: furliSheetUp 0.26s cubic-bezier(.2,.8,.3,1) !important;
            padding-bottom: env(safe-area-inset-bottom, 14px) !important;
          }
          .furli-admin-root input, .furli-admin-root select, .furli-admin-root textarea { font-size: 16px !important; }
          .furli-admin-root button { min-height: 38px; }
        }
      `}</style>
      <div className="furli-admin-panel" style={isMobile ? { display: 'block', minHeight: '100vh' } : { display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', overflow: 'hidden' }}>
        {/* v44 (mobile): sidebar hidden entirely - the bottom tab bar takes over navigation, no
            drawer/hamburger left (mockup furli-admin-v6.jsx:2138, its own comment: "na telefonie
            sidebar ukryty — nawigację przejmuje dolny pasek"). */}
        <aside
          style={isMobile
            ? { display: 'none' }
            : { background: C.sidebar, display: 'flex', flexDirection: 'column', padding: '20px 14px', color: C.sidebarText, overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 8px 18px', flexShrink: 0 }}>
            <span style={{ fontFamily: FONT_HEAD, fontSize: 23, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' }}>FURLI</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.teal, background: 'oklch(0.6 0.1 180 / 0.2)', padding: '2px 7px', borderRadius: 6 }}>{t('admin.layout.badgeLabel')}</span>
          </div>
          <div style={{ background: 'oklch(1 0 0 / 0.08)', border: '1px solid oklch(1 0 0 / 0.1)', borderRadius: 14, padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: C.teal, color: '#08312e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>AO</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t('admin.layout.adminRoleLabel')}</div>
              <div style={{ fontSize: 11, color: 'oklch(0.82 0.05 75)' }}>{t('admin.layout.operatorLabel')}</div>
            </div>
          </div>
          {/* Only this list scrolls when it doesn't fit — the logout button below stays pinned and
              reachable regardless of nav length or viewport height. `minHeight: 0` is required for a
              flex child to actually shrink/scroll instead of forcing the whole sidebar to overflow
              (a flex item's default min-height is `auto`, i.e. "never smaller than my content"). */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {navSections.map((section) => (
              <div key={section.group}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.68 0.04 70)', padding: '10px 10px 4px' }}>{section.group}</div>
                {section.items.map((item) => {
                  const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: active ? '#3a2d12' : 'oklch(0.86 0.03 75)', cursor: 'pointer', border: 'none', background: active ? C.primary : 'transparent', fontFamily: FONT_BODY, textAlign: 'left', width: '100%', textDecoration: 'none', boxShadow: active ? '0 4px 14px oklch(0.55 0.14 75 / 0.4)' : 'none' }}
                    >
                      <item.Icon size={18} />
                      {item.label}
                      {item.badge === 'pending' && pendingVerificationCount > 0 ? (
                        <span style={{ marginLeft: 'auto', background: active ? '#fff' : C.amber, color: active ? C.amber : '#fff', fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                          {pendingVerificationCount}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: 'oklch(0.86 0.03 75)', cursor: 'pointer', border: '1px solid oklch(1 0 0 / 0.1)', background: 'oklch(1 0 0 / 0.04)', fontFamily: FONT_BODY, textAlign: 'left', width: '100%', flexShrink: 0, marginTop: 8 }}>
            <LogOut size={18} color="oklch(0.80 0.06 30)" />
            {t('common.actions.logout')}
          </button>
        </aside>

        <div className="furli-admin-main" style={isMobile ? {} : { overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'oklch(0.97 0.01 85 / 0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: isMobile ? '12px 16px' : '18px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {isMobile && !isDirectTab ? (
                <button onClick={() => navigate('/more')} aria-label={t('common.actions.back')} style={{ width: 40, height: 40, borderRadius: 11, background: C.bgCard, boxShadow: shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: C.text, cursor: 'pointer', flexShrink: 0 }}>
                  <ChevronLeft size={20} />
                </button>
              ) : null}
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: FONT_HEAD, fontSize: isMobile ? 19 : 24, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageMeta.title}</h1>
                {!isMobile ? <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{pageMeta.subtitle}</div> : null}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!isMobile ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.primaryLight, color: C.amber, borderRadius: 999, padding: '6px 13px', fontSize: 11.5, fontWeight: 700 }}>
                  <Clock size={14} />
                  {t('admin.layout.pendingVerification', { count: pendingVerificationCount })}
                </span>
              ) : null}
              <div style={{ width: 38, height: 38, borderRadius: 11, background: C.bgCard, boxShadow: shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: C.textMedium, cursor: 'pointer', flexShrink: 0 }}>
                <Bell size={18} />
                {pendingVerificationCount > 0 ? <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: C.roseDark, border: `2px solid ${C.bgCard}` }} /> : null}
              </div>
            </div>
          </div>
          <div key={location.pathname} style={{ padding: isMobile ? '16px 14px 96px' : '24px 30px 40px', animation: 'furliRise 0.3s ease' }}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* v44 (mobile): fixed bottom tab bar - Pulpit · Kolejka · Placówki · Więcej */}
      {isMobile ? (
        <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex', background: 'oklch(0.99 0.005 85 / 0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: `1px solid ${C.border}`, paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}>
          {MOBILE_TABS.map((tab) => {
            const active = tab.routeKey === 'more' ? !isDirectTab : routeKey === tab.routeKey;
            const badgeCount = tab.routeKey === 'queue' ? pendingVerificationCount : 0;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                aria-current={active ? 'page' : undefined}
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '9px 0 5px', cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                <span style={{ position: 'relative', display: 'inline-flex', color: active ? C.amber : C.textMuted }}>
                  <tab.Icon size={20} />
                  {badgeCount > 0 ? (
                    <span style={{ position: 'absolute', top: -5, right: -8, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: C.roseDark, color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {badgeCount}
                    </span>
                  ) : null}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600, color: active ? C.amber : C.textMuted }}>{t(`admin.nav.${tab.routeKey}`)}</span>
              </NavLink>
            );
          })}
        </nav>
      ) : null}

      {toast ? (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', padding: '13px 24px', borderRadius: 12, background: 'oklch(0.25 0.03 55)', color: '#fff', fontSize: 14, fontWeight: 500, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: '90vw' }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
