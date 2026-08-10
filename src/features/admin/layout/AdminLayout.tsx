import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Clock, LogOut, Menu } from '../../../shared/icons';
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
  return 'dashboard';
}

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const { t } = useI18n();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pendingVerificationCount, toast } = useAdminState();
  const navSections = useMemo(() => buildAdminNav(t), [t]);
  const pageMeta = useMemo(() => buildAdminPageMeta(t)[resolveAdminRouteKey(location.pathname)], [t, location.pathname]);

  return (
    <div className="furli-admin-root" style={{ width: '100%', minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        .furli-admin-panel input:focus, .furli-admin-panel textarea:focus, .furli-admin-panel select:focus { outline: 2px solid oklch(0.72 0.12 75 / 0.45); }
        .furli-admin-main::-webkit-scrollbar { width: 10px; }
        .furli-admin-main::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 6px; }
        @keyframes furliRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="furli-admin-panel" style={isMobile ? { display: 'block', minHeight: '100vh' } : { display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', overflow: 'hidden' }}>
        {isMobile && drawerOpen ? <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.02 60 / 0.5)', zIndex: 55 }} /> : null}
        <aside
          style={isMobile
            ? { position: 'fixed', top: 0, left: 0, bottom: 0, width: 262, zIndex: 60, transform: drawerOpen ? 'translateX(0)' : 'translateX(-110%)', transition: 'transform 0.26s ease', background: C.sidebar, display: 'flex', flexDirection: 'column', padding: '20px 14px', color: C.sidebarText, overflow: 'hidden', boxShadow: drawerOpen ? '0 0 50px rgba(0,0,0,0.45)' : 'none' }
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
                      onClick={() => setDrawerOpen(false)}
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
              {isMobile ? <button onClick={() => setDrawerOpen(true)} aria-label={t('admin.layout.menuLabel')} style={{ width: 40, height: 40, borderRadius: 11, background: C.bgCard, boxShadow: shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: C.text, cursor: 'pointer', flexShrink: 0 }}><Menu size={20} /></button> : null}
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
          <div key={location.pathname} style={{ padding: isMobile ? '16px 14px 30px' : '24px 30px 40px', animation: 'furliRise 0.3s ease' }}>
            <Outlet />
          </div>
        </div>
      </div>
      {toast ? (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', padding: '13px 24px', borderRadius: 12, background: 'oklch(0.25 0.03 55)', color: '#fff', fontSize: 14, fontWeight: 500, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: '90vw' }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
