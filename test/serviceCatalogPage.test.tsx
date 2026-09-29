import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogDocument, ServiceCatalogAdminState } from '../src/features/admin/serviceCatalog/types';

// F-146 "Katalog usług": the admin panel shows the published catalog as a tree per provider type,
// edits a draft (a variant only inside its service), saves it, and publishes it only when the
// backend reports no issues. What providers use can't be removed.

const document: CatalogDocument = {
  version: 'v1',
  categories: [{
    type: 'GROOMER',
    label: 'Groomer',
    labelEn: 'Groomer',
    sharedAddons: false,
    addonGroups: [],
    addons: [],
    services: [{
      key: 'kapiel', label: 'Kąpiel', labelEn: 'Bath', description: 'Mycie', descriptionEn: 'Wash', variantKind: 'CHOICE', bookingMode: 'SLOT', bookable: true,
      variants: [{ key: 'standard', label: 'standard', labelEn: 'standard', priceUnit: 'VISIT' }],
      addonKeys: [],
    }],
    featureGroups: [],
    features: [],
  }],
};

function state(overrides: Partial<ServiceCatalogAdminState> = {}): ServiceCatalogAdminState {
  return {
    published: { revision: 1, version: 'v1', publishedAt: '2026-10-01T10:00:00Z', publishedBy: null, document },
    draft: null,
    providerTypes: [{ type: 'GROOMER', stayBased: false }, { type: 'HOTEL', stayBased: true }, { type: 'VETERINARIAN', stayBased: false }],
    usage: { services: { GROOMER: { kapiel: 3 } }, variants: {}, addons: {}, features: {} },
    ...overrides,
  };
}

const api = vi.hoisted(() => ({
  getServiceCatalogAdmin: vi.fn(),
  saveServiceCatalogDraft: vi.fn(),
  discardServiceCatalogDraft: vi.fn(),
  publishServiceCatalogDraft: vi.fn(),
  getServiceCatalogRevisions: vi.fn(),
}));
vi.mock('../src/features/admin/serviceCatalog/api', () => api);
vi.mock('../src/features/admin/context', () => ({ useAdminState: () => ({ accessToken: 'token', showToast: vi.fn() }) }));

const { AdminServiceCatalogPage } = await import('../src/features/admin/serviceCatalog/ServiceCatalogPage');
const { I18nProvider } = await import('../src/shared/i18n');

function renderPage() {
  return render(<I18nProvider><AdminServiceCatalogPage /></I18nProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('furli.locale', 'pl-PL');
});

describe('Katalog usług', () => {
  it('shows the published catalog and locks what providers use', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state());
    renderPage();

    expect(await screen.findByText('Opublikowana wersja v1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Kąpiel/ }));

    expect(screen.getByRole('heading', { name: 'Usługa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Klucz')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Usuń' })).toBeDisabled();
    expect(screen.getByText('Używają go 3 placówki - nie można go usunąć.')).toBeInTheDocument();
    expect(screen.getByLabelText('Warianty różnią się')).toBeDisabled();
  });

  it('adds a variant inside its service and saves the draft', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state());
    api.saveServiceCatalogDraft.mockImplementation(async (_token: string, draftDocument: CatalogDocument) => state({
      draft: { revision: 2, lockVersion: 0, updatedAt: '2026-10-02T10:00:00Z', updatedBy: 'admin@furli.pl', document: { ...draftDocument, version: 'v2' }, issues: [] },
    }));
    renderPage();
    await screen.findByText('Opublikowana wersja v1');

    // Services start collapsed to a one-line summary; selecting one opens its variants.
    expect(screen.getByText('1 wariant · Termin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dodaj wariant' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Kąpiel/ }));
    await user.click(screen.getByRole('button', { name: 'Dodaj wariant' }));

    // The name comes first: nothing is added without one, or under a name the service already has.
    const name = screen.getByLabelText('Nazwa nowego wariantu, np. „Duży pies”');
    expect(screen.getByRole('button', { name: 'Dodaj' })).toBeDisabled();
    await user.type(name, 'STANDARD');
    expect(screen.getByText('Taka nazwa już tu jest - wybierz inną.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj' })).toBeDisabled();
    await user.clear(name);
    await user.type(name, 'Duży pies{Enter}');

    expect(screen.getByRole('heading', { name: 'Wariant usługi „Kąpiel”' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nazwa')).toHaveValue('Duży pies');
    expect(screen.getByLabelText('Klucz')).toHaveValue('duzy-pies');
    // The key is never typed: until published it follows the name.
    expect(screen.getByLabelText('Klucz')).toHaveAttribute('readonly');
    await user.type(screen.getByLabelText('Nazwa'), ' XL');
    expect(screen.getByLabelText('Klucz')).toHaveValue('duzy-pies-xl');
    expect(screen.getByText('Niezapisane zmiany')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opublikuj/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Zapisz szkic katalogu' }));

    await waitFor(() => expect(api.saveServiceCatalogDraft).toHaveBeenCalledOnce());
    const [, saved, lockVersion] = api.saveServiceCatalogDraft.mock.calls[0];
    expect(lockVersion).toBeNull();
    expect(saved.categories[0].services[0].variants.map((variant: { key: string }) => variant.key)).toEqual(['standard', 'duzy-pies-xl']);
    expect(await screen.findByText('Szkic v2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opublikuj/ })).toBeEnabled();
  });

  it('will not save the catalog while an element has no name', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state());
    renderPage();
    await screen.findByText('Opublikowana wersja v1');

    await user.click(screen.getByRole('button', { name: /^Kąpiel/ }));
    await user.clear(screen.getByLabelText('Nazwa'));

    expect(screen.getByText('Podaj nazwę - bez niej nie zapiszesz szkicu.')).toBeInTheDocument();
    expect(screen.getByText('1 element nie ma nazwy - uzupełnij ją, aby zapisać szkic.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz szkic katalogu' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nazwa'), 'Kąpiel i suszenie');
    expect(screen.getByRole('button', { name: 'Zapisz szkic katalogu' })).toBeEnabled();
    expect(api.saveServiceCatalogDraft).not.toHaveBeenCalled();
  });

  it('refuses to publish while the draft has issues and points at them', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state({
      draft: {
        revision: 2, lockVersion: 4, updatedAt: '2026-10-02T10:00:00Z', updatedBy: 'admin@furli.pl', document,
        issues: [{ path: ['GROOMER', 'services', 'kapiel'], field: 'description', code: 'catalog.issue.text.required', message: 'Uzupełnij to pole.', detail: 'd' }],
      },
    }));
    renderPage();

    expect(await screen.findByText('Popraw 1 problem przed publikacją.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opublikuj/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /kapiel — Uzupełnij to pole/ }));
    expect(screen.getByRole('heading', { name: 'Usługa' })).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { name: 'Usługa' }).parentElement!.parentElement!).getAllByRole('alert')[0]).toHaveTextContent('Uzupełnij to pole.');
  });

  it('publishes a draft without issues after confirmation', async () => {
    const user = userEvent.setup();
    const draft = { revision: 2, lockVersion: 4, updatedAt: '2026-10-02T10:00:00Z', updatedBy: 'admin@furli.pl', document, issues: [] };
    api.getServiceCatalogAdmin.mockResolvedValue(state({ draft }));
    api.publishServiceCatalogDraft.mockResolvedValue(state({ published: { revision: 2, version: 'v2', publishedAt: '2026-10-02T11:00:00Z', publishedBy: 'admin@furli.pl', document } }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Opublikuj/ }));
    await user.click(screen.getByRole('button', { name: /Tak, opublikuj/ }));

    expect(api.publishServiceCatalogDraft).toHaveBeenCalledWith('token', 4);
    expect(await screen.findByText('Opublikowana wersja v2')).toBeInTheDocument();
  });

  it('offers only provider types without a catalog and opens the added one', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state());
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Dodaj typ placówki' }));
    const options = within(screen.getByRole('menu')).getAllByRole('menuitem').map((option) => option.textContent?.trim());
    expect(options).toEqual(['Psi hotel', 'Weterynarz']);

    await user.click(screen.getByRole('menuitem', { name: /Psi hotel/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Psi hotel/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ustawienia typu: Psi hotel' })).toBeInTheDocument();
  });

  it('switches between services, add-ons and features of a type', async () => {
    const user = userEvent.setup();
    api.getServiceCatalogAdmin.mockResolvedValue(state());
    renderPage();
    await screen.findByText('Opublikowana wersja v1');

    expect(screen.getByRole('tab', { name: /Usługi/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Dodaj usługę' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Cechy placówki/ }));
    expect(screen.queryByRole('button', { name: 'Dodaj usługę' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj grupę cech' })).toBeInTheDocument();
  });
});
