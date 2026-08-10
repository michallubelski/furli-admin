import type { AdminRouteKey } from '../shared/types/furli';
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  UserCog,
} from '../shared/icons';
import type { IconComponent } from '../shared/types/furli';

export interface NavEntry {
  path: string;
  label: string;
  Icon: IconComponent;
  badge?: 'pending';
}

export interface NavSection {
  group: string;
  items: NavEntry[];
}

export interface PageMeta {
  title: string;
  subtitle: string;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

// No `/admin` prefix - furli-admin is its own standalone app, not a sub-route of a multi-role
// app (see furli-fronted's src/app/routes.tsx, which this was extracted from and where these
// paths were `/admin/dashboard` etc.).
export function buildAdminPageMeta(t: Translate): Record<AdminRouteKey, PageMeta> {
  return {
    dashboard: { title: t('admin.routes.dashboard.title'), subtitle: t('admin.routes.dashboard.subtitle') },
    queue: { title: t('admin.routes.queue.title'), subtitle: t('admin.routes.queue.subtitle') },
    verification: { title: t('admin.routes.verification.title'), subtitle: t('admin.routes.verification.subtitle') },
    providers: { title: t('admin.routes.providers.title'), subtitle: t('admin.routes.providers.subtitle') },
    subscriptions: { title: t('admin.routes.subscriptions.title'), subtitle: t('admin.routes.subscriptions.subtitle') },
    reviews: { title: t('admin.routes.reviews.title'), subtitle: t('admin.routes.reviews.subtitle') },
    reports: { title: t('admin.routes.reports.title'), subtitle: t('admin.routes.reports.subtitle') },
    apiIntegrations: { title: t('admin.routes.apiIntegrations.title'), subtitle: t('admin.routes.apiIntegrations.subtitle') },
    analytics: { title: t('admin.routes.analytics.title'), subtitle: t('admin.routes.analytics.subtitle') },
    catalog: { title: t('admin.routes.catalog.title'), subtitle: t('admin.routes.catalog.subtitle') },
    communication: { title: t('admin.routes.communication.title'), subtitle: t('admin.routes.communication.subtitle') },
    settings: { title: t('admin.routes.settings.title'), subtitle: t('admin.routes.settings.subtitle') },
    admins: { title: t('admin.routes.admins.title'), subtitle: t('admin.routes.admins.subtitle') },
  };
}

export function buildAdminNav(t: Translate): NavSection[] {
  return [
    {
      group: t('admin.nav.operations'),
      items: [
        { path: '/dashboard', label: t('admin.nav.dashboard'), Icon: LayoutDashboard },
        // v5 (mockup): one unified decision queue replaces the separate Weryfikacja/Zgłoszenia
        // nav entries - both pages/routes still exist (VerificationPage, ReportsPage), they're
        // just no longer linked from the sidebar, mirroring the mockup's own NAV/TITLES split.
        { path: '/queue', label: t('admin.nav.queue'), Icon: ShieldCheck, badge: 'pending' },
        { path: '/providers', label: t('admin.nav.providers'), Icon: Store },
      ],
    },
    {
      group: t('admin.nav.finance'),
      items: [
        { path: '/subscriptions', label: t('admin.nav.subscriptions'), Icon: CreditCard },
        { path: '/reviews', label: t('admin.nav.reviews'), Icon: MessageSquare },
      ],
    },
    {
      group: t('admin.nav.platform'),
      items: [
        { path: '/api-integrations', label: t('admin.nav.apiIntegrations'), Icon: Plug },
        { path: '/analytics', label: t('admin.nav.analytics'), Icon: BarChart3 },
        { path: '/catalog', label: t('admin.nav.catalog'), Icon: Tag },
        { path: '/communication', label: t('admin.nav.communication'), Icon: Megaphone },
        { path: '/settings', label: t('admin.nav.settings'), Icon: SlidersHorizontal },
        { path: '/admins', label: t('admin.nav.admins'), Icon: UserCog },
      ],
    },
  ];
}
