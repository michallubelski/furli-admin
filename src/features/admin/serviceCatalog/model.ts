import type {
  AddonPriceUnit,
  BookingMode,
  CatalogAddonDoc,
  CatalogCategoryDoc,
  CatalogDocument,
  CatalogFeatureDoc,
  CatalogGroupDoc,
  CatalogIssueDto,
  CatalogServiceDoc,
  CatalogUsageDto,
  CatalogVariantDoc,
  VariantKind,
  VariantPriceUnit,
} from './types';

// Editing rules of the service catalog. The editor builds the document only through these
// functions, so the structure it produces already follows furli-backend's ServiceCatalog rules
// (the hierarchy, which units and variant kinds fit how a service is booked, night tiers without
// gaps). Every element is created with its name (and a key made from it); a name cleared later
// blocks saving (unnamedNodes). What can still be wrong (a weight range to fill in) the backend
// reports as issues on save, and publishing refuses them.

/** Which element of the document is selected - by position, so a renamed key keeps the selection. */
export type NodeRef =
  | { kind: 'category'; category: number }
  | { kind: 'service'; category: number; index: number }
  | { kind: 'variant'; category: number; service: number; index: number }
  | { kind: 'addonGroup'; category: number; index: number }
  | { kind: 'addon'; category: number; index: number }
  | { kind: 'featureGroup'; category: number; index: number }
  | { kind: 'feature'; category: number; index: number };

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIACRITICS: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ż: 'z', ź: 'z' };

/** A key from a label - the backend's rule: lowercase ASCII words joined by "-". */
export function slugKey(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśżź]/g, (char) => DIACRITICS[char] || char)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/** `base`, or `base-2`, `base-3`... - the first one not taken at this level. */
export function uniqueKey(base: string, taken: string[]): string {
  const root = slugKey(base) || 'nowy';
  if (!taken.includes(root)) return root;
  let suffix = 2;
  while (taken.includes(`${root}-${suffix}`)) suffix += 1;
  return `${root}-${suffix}`;
}

export function cloneDocument(document: CatalogDocument): CatalogDocument {
  return JSON.parse(JSON.stringify(document)) as CatalogDocument;
}

// --- how a service is booked decides which units and variant kinds are allowed

export function bookingModeOf(service: CatalogServiceDoc, stayBased: boolean): BookingMode {
  return service.bookingMode ?? (stayBased ? 'STAY' : 'SLOT');
}

export function allowedBookingModes(stayBased: boolean): BookingMode[] {
  return stayBased ? ['STAY', 'SLOT'] : ['SLOT'];
}

export function allowedVariantKinds(mode: BookingMode): VariantKind[] {
  return mode === 'STAY' ? ['NIGHTS', 'CHOICE', 'WEIGHT', 'DURATION'] : ['CHOICE', 'WEIGHT', 'DURATION'];
}

export function allowedPriceUnits(mode: BookingMode): VariantPriceUnit[] {
  return mode === 'STAY' ? ['NIGHT', 'STAY'] : ['VISIT'];
}

export function allowedAddonPriceUnits(stayBased: boolean): AddonPriceUnit[] {
  return stayBased ? ['ONCE', 'PER_DAY'] : ['ONCE'];
}

function defaultPriceUnit(mode: BookingMode, kind: VariantKind): VariantPriceUnit {
  if (mode === 'SLOT') return 'VISIT';
  return kind === 'NIGHTS' ? 'NIGHT' : 'STAY';
}

// --- new elements: each only inside its parent, with values that already fit the parent

export function newCategory(type: string, label: string): CatalogCategoryDoc {
  return { type, label: label.trim(), labelEn: '', sharedAddons: false, addonGroups: [], addons: [], services: [], featureGroups: [], features: [] };
}

export function newVariant(service: CatalogServiceDoc, stayBased: boolean, label: string): CatalogVariantDoc {
  const mode = bookingModeOf(service, stayBased);
  const variant: CatalogVariantDoc = {
    key: uniqueKey(slugKey(label) || 'wariant', service.variants.map((existing) => existing.key)),
    label: label.trim(),
    labelEn: '',
    priceUnit: defaultPriceUnit(mode, service.variantKind),
  };
  if (service.variantKind === 'NIGHTS') {
    const last = service.variants[service.variants.length - 1];
    variant.nightsMin = last ? (last.nightsMax ?? last.nightsMin ?? 0) + 1 : 1;
    variant.nightsMax = null;
  } else if (service.variantKind === 'DURATION') {
    const longest = Math.max(0, ...service.variants.map((existing) => existing.durationMinutes ?? 0));
    variant.durationMinutes = longest > 0 ? longest + 30 : 60;
  } else if (service.variantKind === 'WEIGHT') {
    // The first range has no lower bound; the next one starts where the heaviest one ends.
    const heaviest = Math.max(0, ...service.variants.map((existing) => existing.weightMax ?? existing.weightMin ?? 0));
    variant.weightMin = heaviest > 0 ? heaviest : null;
    variant.weightMax = null;
  }
  return variant;
}

/** Adds a variant; for night tiers the previous open-ended tier is closed where the new one starts. */
export function addVariant(service: CatalogServiceDoc, stayBased: boolean, label: string): CatalogServiceDoc {
  const variants = service.variants.map((variant) => ({ ...variant }));
  if (service.variantKind === 'NIGHTS' && variants.length > 0) {
    const last = variants[variants.length - 1];
    if (last.nightsMax == null) last.nightsMax = last.nightsMin ?? 1;
  }
  return { ...service, variants: [...variants, newVariant({ ...service, variants }, stayBased, label)] };
}

/**
 * A service always comes with its first variant - a service without one could never be offered. It
 * is called "standard", like single-variant services in the catalog; the admin renames it when the
 * service gets more variants.
 */
export const FIRST_VARIANT_LABEL = 'standard';

export function newService(category: CatalogCategoryDoc, stayBased: boolean, label: string): CatalogServiceDoc {
  const mode: BookingMode = stayBased ? 'STAY' : 'SLOT';
  const service: CatalogServiceDoc = {
    key: uniqueKey(slugKey(label) || 'nowa-usluga', category.services.map((existing) => existing.key)),
    label: label.trim(),
    labelEn: '',
    description: '',
    descriptionEn: '',
    variantKind: 'CHOICE',
    bookingMode: mode,
    bookable: true,
    variants: [],
    addonKeys: [],
  };
  return { ...service, variants: [newVariant(service, stayBased, FIRST_VARIANT_LABEL)] };
}

export function newGroup(existing: CatalogGroupDoc[] | null | undefined, base: string, label: string): CatalogGroupDoc {
  return { key: uniqueKey(slugKey(label) || base, (existing ?? []).map((group) => group.key)), label: label.trim(), labelEn: '' };
}

export function newAddon(category: CatalogCategoryDoc, groupKey: string | null, label: string): CatalogAddonDoc {
  return {
    key: uniqueKey(slugKey(label) || 'nowy-dodatek', (category.addons ?? []).map((addon) => addon.key)),
    label: label.trim(),
    labelEn: '',
    group: groupKey,
    priceUnit: 'ONCE',
    defaultDurationMinutes: 0,
  };
}

/** A feature only inside a feature group - the backend refuses one without. */
export function newFeature(category: CatalogCategoryDoc, groupKey: string, label: string): CatalogFeatureDoc {
  return { key: uniqueKey(slugKey(label) || 'nowa-cecha', (category.features ?? []).map((feature) => feature.key)), label: label.trim(), labelEn: '', group: groupKey, profileFlag: null };
}

/** Whether `label` is already the name of one of `siblings` (ignoring case and surrounding spaces). */
export function nameTaken(label: string, siblings: { label: string }[]): boolean {
  const name = label.trim().toLocaleLowerCase('pl');
  return siblings.some((sibling) => sibling.label.trim().toLocaleLowerCase('pl') === name);
}

/** Elements whose name was cleared - the draft can't be saved until each has one again. */
export function unnamedNodes(document: CatalogDocument): NodeRef[] {
  const refs: NodeRef[] = [];
  const blank = (label: string) => !label.trim();
  document.categories.forEach((category, index) => {
    if (blank(category.label)) refs.push({ kind: 'category', category: index });
    category.services.forEach((service, serviceIndex) => {
      if (blank(service.label)) refs.push({ kind: 'service', category: index, index: serviceIndex });
      service.variants.forEach((variant, variantIndex) => {
        if (blank(variant.label)) refs.push({ kind: 'variant', category: index, service: serviceIndex, index: variantIndex });
      });
    });
    (category.addonGroups ?? []).forEach((group, groupIndex) => { if (blank(group.label)) refs.push({ kind: 'addonGroup', category: index, index: groupIndex }); });
    (category.addons ?? []).forEach((addon, addonIndex) => { if (blank(addon.label)) refs.push({ kind: 'addon', category: index, index: addonIndex }); });
    (category.featureGroups ?? []).forEach((group, groupIndex) => { if (blank(group.label)) refs.push({ kind: 'featureGroup', category: index, index: groupIndex }); });
    (category.features ?? []).forEach((feature, featureIndex) => { if (blank(feature.label)) refs.push({ kind: 'feature', category: index, index: featureIndex }); });
  });
  return refs;
}

// --- changes that keep the rest of the service consistent

/**
 * Switches how a service's variants differ. Fields the new kind doesn't use are cleared; night tiers
 * are laid out 1, 2, ... with the last one open-ended; durations get distinct lengths.
 */
export function changeVariantKind(service: CatalogServiceDoc, kind: VariantKind, stayBased: boolean): CatalogServiceDoc {
  const mode = bookingModeOf(service, stayBased);
  const variants = service.variants.map((variant, index, all) => {
    const next: CatalogVariantDoc = { key: variant.key, label: variant.label, labelEn: variant.labelEn, priceUnit: variant.priceUnit };
    if (kind === 'WEIGHT') {
      next.weightMin = variant.weightMin ?? null;
      next.weightMax = variant.weightMax ?? null;
    }
    if (kind === 'NIGHTS') {
      next.nightsMin = index + 1;
      next.nightsMax = index === all.length - 1 ? null : index + 1;
      next.priceUnit = 'NIGHT';
    } else if (mode === 'STAY' && variant.stayWindow) {
      next.stayWindow = variant.stayWindow;
    }
    if (kind === 'DURATION') {
      next.durationMinutes = variant.durationMinutes ?? 30 * (index + 2);
    } else if (mode === 'SLOT' && variant.durationMinutes != null) {
      next.durationMinutes = variant.durationMinutes;
    }
    if (!allowedPriceUnits(mode).includes(next.priceUnit)) next.priceUnit = defaultPriceUnit(mode, kind);
    return next;
  });
  if (kind === 'DURATION') {
    const seen = new Set<number>();
    variants.forEach((variant) => {
      while (seen.has(variant.durationMinutes as number)) variant.durationMinutes = (variant.durationMinutes as number) + 15;
      seen.add(variant.durationMinutes as number);
    });
  }
  return { ...service, variantKind: kind, variants };
}

/** Books a service as a stay or a slot; its variants follow (units, stay windows, night tiers). */
export function changeBookingMode(service: CatalogServiceDoc, mode: BookingMode, stayBased: boolean): CatalogServiceDoc {
  const kind = mode === 'SLOT' && service.variantKind === 'NIGHTS' ? 'CHOICE' : service.variantKind;
  const variants = service.variants.map((variant) => {
    const next = { ...variant };
    if (mode === 'SLOT') delete next.stayWindow;
    if (mode === 'STAY' && kind !== 'DURATION') delete next.durationMinutes;
    next.priceUnit = allowedPriceUnits(mode).includes(variant.priceUnit) ? variant.priceUnit : defaultPriceUnit(mode, kind);
    return next;
  });
  return changeVariantKind({ ...service, bookingMode: mode, variants }, kind, stayBased);
}

/** Removes an add-on and every service's recommendation of it. */
export function removeAddon(category: CatalogCategoryDoc, index: number): CatalogCategoryDoc {
  const key = (category.addons ?? [])[index]?.key;
  return {
    ...category,
    addons: (category.addons ?? []).filter((_, current) => current !== index),
    services: category.services.map((service) => ({ ...service, addonKeys: (service.addonKeys ?? []).filter((addonKey) => addonKey !== key) })),
  };
}

/** Removes an add-on group; its add-ons stay, ungrouped (a group is optional for an add-on). */
export function removeAddonGroup(category: CatalogCategoryDoc, index: number): CatalogCategoryDoc {
  const key = (category.addonGroups ?? [])[index]?.key;
  return {
    ...category,
    addonGroups: (category.addonGroups ?? []).filter((_, current) => current !== index),
    addons: (category.addons ?? []).map((addon) => (addon.group === key ? { ...addon, group: null } : addon)),
  };
}

/** A feature group can go only once it has no features - a feature can't exist without one. */
export function featureGroupHasFeatures(category: CatalogCategoryDoc, index: number): boolean {
  const key = (category.featureGroups ?? [])[index]?.key;
  return (category.features ?? []).some((feature) => feature.group === key);
}

/** Renames a key and every reference to it at the same level (add-on recommendations, group links). */
export function renameAddonKey(category: CatalogCategoryDoc, from: string, to: string): CatalogCategoryDoc {
  return {
    ...category,
    addons: (category.addons ?? []).map((addon) => (addon.key === from ? { ...addon, key: to } : addon)),
    services: category.services.map((service) => ({ ...service, addonKeys: (service.addonKeys ?? []).map((key) => (key === from ? to : key)) })),
  };
}

export function renameGroupKey(category: CatalogCategoryDoc, section: 'addonGroups' | 'featureGroups', from: string, to: string): CatalogCategoryDoc {
  if (section === 'addonGroups') {
    return {
      ...category,
      addonGroups: (category.addonGroups ?? []).map((group) => (group.key === from ? { ...group, key: to } : group)),
      addons: (category.addons ?? []).map((addon) => (addon.group === from ? { ...addon, group: to } : addon)),
    };
  }
  return {
    ...category,
    featureGroups: (category.featureGroups ?? []).map((group) => (group.key === from ? { ...group, key: to } : group)),
    features: (category.features ?? []).map((feature) => (feature.group === from ? { ...feature, group: to } : feature)),
  };
}

// --- what providers use (published keys can't be renamed, entries in use can't be removed)

/** Whether the element's key exists in the published catalog - such a key never changes. */
export function isPublishedKey(published: CatalogDocument, draft: CatalogDocument, ref: NodeRef): boolean {
  const category = draft.categories[ref.category];
  const live = published.categories.find((candidate) => candidate.type === category?.type);
  if (!category || !live) return false;
  switch (ref.kind) {
    case 'category':
      return true;
    case 'service':
      return live.services.some((service) => service.key === category.services[ref.index]?.key);
    case 'variant': {
      const service = category.services[ref.service];
      const liveService = live.services.find((candidate) => candidate.key === service?.key);
      return !!liveService && liveService.variants.some((variant) => variant.key === service.variants[ref.index]?.key);
    }
    case 'addon':
      return (live.addons ?? []).some((addon) => addon.key === (category.addons ?? [])[ref.index]?.key);
    case 'addonGroup':
      return (live.addonGroups ?? []).some((group) => group.key === (category.addonGroups ?? [])[ref.index]?.key);
    case 'featureGroup':
      return (live.featureGroups ?? []).some((group) => group.key === (category.featureGroups ?? [])[ref.index]?.key);
    case 'feature':
      return (live.features ?? []).some((feature) => feature.key === (category.features ?? [])[ref.index]?.key);
  }
}

/** How many providers use the element (0 when none) - such an element can't be removed. */
export function usageOf(usage: CatalogUsageDto, draft: CatalogDocument, ref: NodeRef): number {
  const category = draft.categories[ref.category];
  if (!category) return 0;
  const type = category.type;
  switch (ref.kind) {
    case 'category':
      return Object.values(usage.services[type] ?? {}).reduce((sum, count) => sum + count, 0);
    case 'service':
      return usage.services[type]?.[category.services[ref.index]?.key] ?? 0;
    case 'variant': {
      const service = category.services[ref.service];
      return usage.variants[type]?.[service?.key]?.[service?.variants[ref.index]?.key] ?? 0;
    }
    case 'addon':
      return usage.addons[type]?.[(category.addons ?? [])[ref.index]?.key] ?? 0;
    case 'feature':
      return usage.features[type]?.[(category.features ?? [])[ref.index]?.key] ?? 0;
    default:
      return 0;
  }
}

// --- issues reported by the backend, pointed at the elements they are about

/** The element an issue is about, found by its key path in the current document; null if gone. */
export function refForIssue(document: CatalogDocument, issue: CatalogIssueDto): NodeRef | null {
  const [type, section, key, sub, subKey] = issue.path;
  const category = document.categories.findIndex((candidate) => candidate.type === type);
  if (category < 0) return null;
  const doc = document.categories[category];
  if (!section) return { kind: 'category', category };
  if (section === 'services') {
    const index = doc.services.findIndex((service) => service.key === key);
    if (index < 0) return { kind: 'category', category };
    if (sub === 'variants') {
      const variant = doc.services[index].variants.findIndex((candidate) => candidate.key === subKey);
      return variant < 0 ? { kind: 'service', category, index } : { kind: 'variant', category, service: index, index: variant };
    }
    return { kind: 'service', category, index };
  }
  const list = section === 'addons' ? doc.addons : section === 'addonGroups' ? doc.addonGroups : section === 'featureGroups' ? doc.featureGroups : section === 'features' ? doc.features : null;
  const kind = section === 'addons' ? 'addon' : section === 'addonGroups' ? 'addonGroup' : section === 'featureGroups' ? 'featureGroup' : 'feature';
  const index = (list ?? []).findIndex((item) => item.key === key);
  return index < 0 ? { kind: 'category', category } : ({ kind, category, index } as NodeRef);
}

export function sameRef(left: NodeRef | null, right: NodeRef | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Issues about exactly this element. */
export function issuesFor(document: CatalogDocument, issues: CatalogIssueDto[], ref: NodeRef): CatalogIssueDto[] {
  return issues.filter((issue) => sameRef(refForIssue(document, issue), ref));
}
