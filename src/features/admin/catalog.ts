import type { ProviderType } from '../../shared/types/furli';
import { SERVICE_CATALOG_BASE } from '../../shared/constants/serviceCatalog';
import { SPECIALTIES_BY_TYPE } from '../../shared/constants/specialties';

export type CatalogKind = 'services' | 'specialties';

// One added-from-panel entry, in the same {id, label, sub} shape the resolved view uses -
// `sub` is the service description or the specialty group depending on `kind`, mirroring how the
// mockup's own CatalogRow treats `desc`/`group` as one interchangeable "sub" field.
export interface CatalogOverlayEntry {
  id: string;
  type: ProviderType;
  label: string;
  sub: string;
}

export interface CatalogOverlay {
  added: CatalogOverlayEntry[];
  edited: Record<string, { label: string; sub: string }>;
  hidden: string[];
}

export function emptyCatalogOverlay(): CatalogOverlay {
  return { added: [], edited: {}, hidden: [] };
}

export interface CatalogEntryView {
  id: string;
  label: string;
  sub: string;
  isBase: boolean;
}

function baseEntries(kind: CatalogKind, type: ProviderType): CatalogEntryView[] {
  if (kind === 'services') {
    return SERVICE_CATALOG_BASE[type].map((entry) => ({ id: entry.key, label: entry.name, sub: entry.desc, isBase: true }));
  }
  return SPECIALTIES_BY_TYPE[type].map((entry) => ({ id: entry.id, label: entry.label, sub: entry.group, isBase: true }));
}

function allEntries(kind: CatalogKind, type: ProviderType, overlay: CatalogOverlay): CatalogEntryView[] {
  const added = overlay.added.filter((entry) => entry.type === type).map((entry) => ({ id: entry.id, label: entry.label, sub: entry.sub, isBase: false }));
  return [...baseEntries(kind, type), ...added].map((entry) => ({ ...entry, ...(overlay.edited[entry.id] || {}) }));
}

// Entries the provider panel actually offers today - base seed plus admin-added, minus hidden.
export function resolveCatalog(kind: CatalogKind, type: ProviderType, overlay: CatalogOverlay): CatalogEntryView[] {
  return allEntries(kind, type, overlay).filter((entry) => !overlay.hidden.includes(entry.id));
}

// Hidden entries are kept visible on this screen (opacity-dimmed) so they can be restored - once
// hidden they still exist in cenniki/profiles the provider already saved, they just stop being
// offered for *new* selections.
export function hiddenCatalogEntries(kind: CatalogKind, type: ProviderType, overlay: CatalogOverlay): CatalogEntryView[] {
  return allEntries(kind, type, overlay).filter((entry) => overlay.hidden.includes(entry.id));
}

export function catalogProviderTypes(kind: CatalogKind, overlay: CatalogOverlay): ProviderType[] {
  const allTypes = Object.keys(kind === 'services' ? SERVICE_CATALOG_BASE : SPECIALTIES_BY_TYPE) as ProviderType[];
  if (kind === 'services') {
    return allTypes;
  }
  // Specialties: only show a type tab when it actually has entries (base or admin-added) - groomer/
  // petsitter/walker have no specialty concept at all (see specialties.ts), so their tab would only
  // ever show an empty screen.
  return allTypes.filter((type) => SPECIALTIES_BY_TYPE[type].length > 0 || overlay.added.some((entry) => entry.type === type));
}
