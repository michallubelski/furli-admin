import type {
  AdminAuditEntry,
  AdminBroadcastRecord,
  AdminFeatureFlag,
  AdminGdprRequest,
  AdminIntegrationRecord,
  AdminPlanConfig,
  AdminProviderRecord,
  AdminReferralCode,
  AdminReportRecord,
  AdminReviewRecord,
  AdminUserRecord,
} from './model';
import type { CatalogOverlay } from './catalog';
import { emptyCatalogOverlay } from './catalog';

export interface AdminSeedData {
  providers: AdminProviderRecord[];
  audit: AdminAuditEntry[];
  reviews: AdminReviewRecord[];
  reports: AdminReportRecord[];
  integrations: AdminIntegrationRecord[];
  broadcasts: AdminBroadcastRecord[];
  referralCodes: AdminReferralCode[];
  featureFlags: AdminFeatureFlag[];
  plans: AdminPlanConfig[];
  admins: AdminUserRecord[];
  gdprRequests: AdminGdprRequest[];
  catalogOverlay: { services: CatalogOverlay; specialties: CatalogOverlay };
}

export function createAdminSeedData(): AdminSeedData {
  return {
    // Real data only, per AdminStateProvider's own contract: `providers` is always overwritten
    // by refreshProviders() against the live backend right after mount (see context.tsx), so
    // seeding it with fabricated companies here only produced a flash of fake data (fake names,
    // fake MRR) on every first-ever admin session before that fetch resolved. The other slices
    // below stay mocked on purpose - the 7 tabs that read them (Opinie/Zgłoszenia/Integracje
    // API/etc.) are explicitly out of scope for the real-data migration.
    providers: [],
    audit: [
      { id: 'a1', action: 'Zawieszono placówkę', target: 'Spacer Team Poznań', actor: 'admin@furli.pl', timestamp: '3 lip 2026, 14:22' },
      { id: 'a2', action: 'Ukryto opinię', target: 'Akademia Psa FURLI', actor: 'anna.admin@furli.pl', timestamp: '3 lip 2026, 12:11' },
      { id: 'a3', action: 'Wysłano prośbę o uzupełnienie', target: 'Psi Fryzjer Premium', actor: 'admin@furli.pl', timestamp: '2 lip 2026, 17:54' },
    ],
    reviews: [
      { id: 'r1', providerName: 'Akademia Psa FURLI', author: 'Marta N.', rating: 2, text: 'Trener spóźnił się 25 minut i nie oddzwonił.', date: '2 lip 2026', reason: 'Zgłoszenie placówki', status: 'reported' },
      { id: 'r2', providerName: 'Spacer Team Poznań', author: 'Łukasz K.', rating: 1, text: 'Usługa została anulowana bez informacji.', date: '1 lip 2026', reason: 'Spór klienta', status: 'hidden' },
      {
        id: 'r3',
        providerName: 'Akademia Psa FURLI',
        author: 'Alicja T.',
        rating: 5,
        text: 'Bardzo dobry kontakt i plan treningowy.',
        date: '30 cze 2026',
        reason: 'Brak zgłoszeń',
        status: 'published',
        staffName: 'Kamil Trener',
        staffRating: 5,
        staffText: 'Kamil świetnie dogadał się z moim psem, widać doświadczenie.',
        staffReply: 'Dziękuję, do zobaczenia na kolejnym treningu!',
      },
    ],
    reports: [
      { id: 'rep1', type: 'Spór rezerwacyjny', subject: 'Brak zwrotu za anulowaną wizytę', providerName: 'Spacer Team Poznań', reporter: 'Klient: Marek Nowak', detail: 'Klient zgłasza brak zwrotu środków za wizytę anulowaną przez placówkę.', openedAt: '3 lip 2026', status: 'open', priority: 'Wysoka' },
      { id: 'rep2', type: 'Treść opinii', subject: 'Podejrzenie opinii nie od klienta', providerName: 'Akademia Psa FURLI', reporter: 'Moderacja automatyczna', detail: 'Opinia wygląda na wystawioną przez osobę niepowiązaną z rezerwacją.', openedAt: '2 lip 2026', status: 'investigating', priority: 'Średnia' },
      { id: 'rep3', type: 'Regulamin placówki', subject: 'Brak wymaganych informacji', providerName: 'Psi Fryzjer Premium', reporter: 'Zespół weryfikacji', detail: 'W profilu placówki brakuje wymaganych informacji o regulaminie świadczenia usług.', openedAt: '1 lip 2026', status: 'resolved', priority: 'Niska' },
    ],
    integrations: [
      { id: 'api1', providerName: 'Akademia Psa FURLI', systemName: 'PMS Clinic Pro', clientId: 'furli_client_8a21f0', env: 'production', scope: 'bookings.read, availability.write', status: 'active', lastEvent: '3 lip 2026, 14:05', webhookOk: true },
      { id: 'api2', providerName: 'Klinika Cztery Łapy', systemName: 'VetSoft ERP', clientId: 'furli_client_5c9d3e', env: 'sandbox', scope: 'profile.write, bookings.read', status: 'pending', lastEvent: 'Nie dotyczy', webhookOk: false },
      { id: 'api3', providerName: 'Spacer Team Poznań', systemName: 'Custom API', clientId: 'furli_client_1f7b6a', env: 'production', scope: 'bookings.read', status: 'revoked', lastEvent: '26 cze 2026, 09:44', webhookOk: false },
    ],
    broadcasts: [
      { id: 'b1', title: 'Zmiana regulaminu płatności online', audience: 'Wszystkie placówki', channel: 'E-mail + panel', sentAt: '1 lip 2026' },
      { id: 'b2', title: 'Przerwa serwisowa API w nocy', audience: 'Placówki z API', channel: 'E-mail', sentAt: '28 cze 2026' },
    ],
    referralCodes: [
      { id: 'c1', code: 'FURLI15', discountLabel: '-15% na pierwszy miesiąc', uses: 38, maxUses: 200, active: true },
      { id: 'c2', code: 'VET50', discountLabel: '-50 zł na plan główny', uses: 12, maxUses: 50, active: true },
    ],
    featureFlags: [
      { id: 'ff1', label: 'Nowa analityka opinii', description: 'Włącza nowy widok jakości opinii w panelu admina.', enabled: true },
      { id: 'ff2', label: 'Automatyczne przypomnienie o dokumentach', description: 'Wysyła przypomnienia o brakujących dokumentach po 48 h.', enabled: false },
      { id: 'ff3', label: 'Eksport RODO CSV', description: 'Pokazuje przycisk eksportu danych dla zgłoszeń RODO.', enabled: false },
    ],
    plans: [
      { id: 'main', name: 'System główny', price: '199 zł / mies.', description: 'Pełny panel FURLI z rezerwacjami i kalendarzem.' },
      { id: 'connected', name: 'Integracja kalendarza', price: '99 zł / mies.', description: 'Widoczność w marketplace z synchronizacją zajętości.' },
    ],
    admins: [
      { id: 'adm1', name: 'Administrator', email: 'admin@furli.pl', roleLabel: 'Owner', lastSeen: 'online', presenceLabel: 'online' },
      { id: 'adm2', name: 'Katarzyna Weryfikacja', email: 'kasia@furli.pl', roleLabel: 'Weryfikator', lastSeen: '15 min temu' },
      { id: 'adm3', name: 'Paweł Support', email: 'pawel@furli.pl', roleLabel: 'Support', lastSeen: '2 godz. temu' },
    ],
    gdprRequests: [
      { id: 'gdpr1', type: 'Eksport danych', subject: 'Akademia Psa FURLI', openedAt: '2 lip 2026' },
      { id: 'gdpr2', type: 'Usunięcie danych', subject: 'Klient końcowy #U-1024', openedAt: '1 lip 2026' },
    ],
    catalogOverlay: { services: emptyCatalogOverlay(), specialties: emptyCatalogOverlay() },
  };
}
