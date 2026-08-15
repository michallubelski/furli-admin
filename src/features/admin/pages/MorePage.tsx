import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui';
import { ChevronRight, LogOut } from '../../../shared/icons';
import { C, FONT_BODY, FONT_HEAD } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { buildAdminNav, buildAdminPageMeta } from '../../../app/routes';

// v44 (mobile): the "Więcej" screen the bottom tab bar's 4th tab opens - everything from the
// desktop sidebar nav that isn't one of the 3 direct tabs (Pulpit/Kolejka/Placówki), reusing
// buildAdminNav so there's exactly one place that knows the nav list (mirrors the mockup's own
// MORE_ITEMS, mockup lines 1946-1954, but built from the real nav config instead of a second
// hand-maintained array).
export function MorePage({ onLogout }: { onLogout: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const navSections = useMemo(() => buildAdminNav(t), [t]);
  const pageMeta = useMemo(() => buildAdminPageMeta(t), [t]);

  const items = navSections
    .filter((section) => section.group !== t('admin.nav.operations'))
    .flatMap((section) => section.items)
    .filter((item) => item.path !== '/dashboard' && item.path !== '/queue' && item.path !== '/providers');

  const routeKeyFromPath = (path: string) => path.replace(/^\//, '').replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

  return (
    <div>
      <Card style={{ padding: 15, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: C.tealLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.tealDark, fontFamily: FONT_BODY }}>
          AO
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, fontFamily: FONT_HEAD, color: C.text }}>{t('admin.layout.adminRoleLabel')}</span>
          <span style={{ display: 'block', fontSize: 12, color: C.textMuted, marginTop: 1 }}>{t('admin.layout.operatorLabel')}</span>
        </span>
      </Card>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((item, index) => {
          const meta = pageMeta[routeKeyFromPath(item.path) as keyof typeof pageMeta];
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', border: 'none', borderTop: index ? `1px solid ${C.border}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: FONT_BODY, textAlign: 'left' }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 11, background: C.bgMuted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.amber }}>
                <item.Icon size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: C.text }}>{item.label}</span>
                {meta ? <span style={{ display: 'block', fontSize: 12, color: C.textMuted, marginTop: 1 }}>{meta.subtitle}</span> : null}
              </span>
              <ChevronRight size={17} color={C.textMuted} />
            </button>
          );
        })}
      </Card>
      <button
        onClick={onLogout}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 13, border: `1px solid ${C.border}`, background: C.bgCard, color: C.roseDark, fontSize: 14.5, fontWeight: 700, fontFamily: FONT_BODY, cursor: 'pointer' }}
      >
        <LogOut size={17} />
        {t('common.actions.logout')}
      </button>
    </div>
  );
}
