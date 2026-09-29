import { describe, expect, it } from 'vitest';
import {
  addVariant,
  allowedPriceUnits,
  allowedVariantKinds,
  changeBookingMode,
  changeVariantKind,
  featureGroupHasFeatures,
  isPublishedKey,
  nameTaken,
  newCategory,
  newFeature,
  newService,
  refForIssue,
  removeAddon,
  removeAddonGroup,
  renameAddonKey,
  slugKey,
  uniqueKey,
  unnamedNodes,
  usageOf,
} from '../src/features/admin/serviceCatalog/model';
import type { CatalogCategoryDoc, CatalogDocument, CatalogServiceDoc } from '../src/features/admin/serviceCatalog/types';

// F-146 "Katalog usług": the editor builds the catalog only through these rules, so what it produces
// already follows furli-backend's ServiceCatalog - the hierarchy, units and variant kinds that fit
// how a service is booked, night tiers without gaps - and it never removes or renames what
// providers use.

function groomer(): CatalogCategoryDoc {
  return {
    type: 'GROOMER',
    label: 'Groomer',
    labelEn: 'Groomer',
    sharedAddons: false,
    addonGroups: [{ key: 'pielegnacja', label: 'Pielęgnacja', labelEn: 'Care' }],
    addons: [{ key: 'pazury', label: 'pazury', labelEn: 'nails', group: 'pielegnacja', priceUnit: 'ONCE', defaultDurationMinutes: 15 }],
    services: [{
      key: 'kapiel', label: 'Kąpiel', labelEn: 'Bath', description: 'd', descriptionEn: 'd', variantKind: 'WEIGHT', bookingMode: 'SLOT', bookable: true,
      variants: [{ key: 'maly', label: 'mały', labelEn: 'small', weightMin: 0, weightMax: 10, priceUnit: 'VISIT' }],
      addonKeys: ['pazury'],
    }],
    featureGroups: [{ key: 'obsluga', label: 'Obsługa', labelEn: 'Service' }],
    features: [{ key: 'bez-klatki', label: 'bez klatki', labelEn: 'cage-free', group: 'obsluga' }],
  };
}

function document(category: CatalogCategoryDoc = groomer()): CatalogDocument {
  return { version: 'v1', categories: [category] };
}

describe('service catalog keys', () => {
  it('makes a key from a Polish name and keeps keys unique at a level', () => {
    expect(slugKey('Pełny grooming – XL')).toBe('pelny-grooming-xl');
    expect(slugKey('Źrebię & Ślimak')).toBe('zrebie-slimak');
    expect(uniqueKey('Kąpiel', ['kapiel', 'kapiel-2'])).toBe('kapiel-3');
  });
});

describe('the hierarchy', () => {
  it('creates a service with its name, together with its first variant, fitting how it is booked', () => {
    const slot = newService(groomer(), false, '  Strzyżenie psa ');
    expect(slot.label).toBe('Strzyżenie psa');
    expect(slot.key).toBe('strzyzenie-psa');
    expect(slot.variants).toHaveLength(1);
    expect(slot.variants[0]).toMatchObject({ label: 'standard', key: 'standard' });
    expect(slot.bookingMode).toBe('SLOT');
    expect(slot.variants[0].priceUnit).toBe('VISIT');

    const stay = newService({ ...newCategory('HOTEL', 'Psi hotel'), services: [] }, true, 'Nocleg');
    expect(stay.bookingMode).toBe('STAY');
    expect(allowedPriceUnits('STAY')).toContain(stay.variants[0].priceUnit);
  });

  it('creates a feature only inside a feature group, and keeps a group while it has features', () => {
    const category = groomer();
    expect(newFeature(category, 'obsluga', 'Odbiór psa').group).toBe('obsluga');
    expect(featureGroupHasFeatures(category, 0)).toBe(true);
  });

  it('removing an add-on also removes every recommendation of it; a removed group leaves its add-ons ungrouped', () => {
    const withoutAddon = removeAddon(groomer(), 0);
    expect(withoutAddon.addons).toEqual([]);
    expect(withoutAddon.services[0].addonKeys).toEqual([]);

    const withoutGroup = removeAddonGroup(groomer(), 0);
    expect(withoutGroup.addonGroups).toEqual([]);
    expect(withoutGroup.addons?.[0].group).toBeNull();
  });

  it('renaming an unpublished add-on key updates the services recommending it', () => {
    expect(renameAddonKey(groomer(), 'pazury', 'obciecie-pazurow').services[0].addonKeys).toEqual(['obciecie-pazurow']);
  });
});

describe('variants follow how the service is booked', () => {
  const stayService: CatalogServiceDoc = {
    key: 'nocleg', label: 'Nocleg', labelEn: 'Stay', description: 'd', descriptionEn: 'd', variantKind: 'CHOICE', bookingMode: 'STAY',
    variants: [{ key: 'a', label: 'a', labelEn: 'a', priceUnit: 'STAY' }, { key: 'b', label: 'b', labelEn: 'b', priceUnit: 'STAY' }],
  };

  it('lays night tiers out from 1 without gaps, the last open-ended, priced per night', () => {
    const tiers = changeVariantKind(stayService, 'NIGHTS', true).variants;
    expect(tiers.map((variant) => [variant.nightsMin, variant.nightsMax, variant.priceUnit])).toEqual([[1, 1, 'NIGHT'], [2, null, 'NIGHT']]);

    const three = addVariant({ ...stayService, variantKind: 'NIGHTS', variants: tiers }, true, 'od 3 nocy').variants;
    expect(three.map((variant) => [variant.nightsMin, variant.nightsMax])).toEqual([[1, 1], [2, 2], [3, null]]);
  });

  it('gives duration variants distinct lengths', () => {
    const durations = changeVariantKind({ ...stayService, bookingMode: 'SLOT', variants: stayService.variants.map((variant) => ({ ...variant, priceUnit: 'VISIT' as const })) }, 'DURATION', false).variants.map((variant) => variant.durationMinutes);
    expect(new Set(durations).size).toBe(durations.length);
  });

  it('a slot has no night tiers or stay windows, and is priced per visit', () => {
    expect(allowedVariantKinds('SLOT')).not.toContain('NIGHTS');
    const nights = changeVariantKind(stayService, 'NIGHTS', true);
    const slot = changeBookingMode({ ...nights, variants: nights.variants.map((variant) => ({ ...variant, stayWindow: { maxNights: 0 } })) }, 'SLOT', true);
    expect(slot.variantKind).toBe('CHOICE');
    slot.variants.forEach((variant) => {
      expect(variant.priceUnit).toBe('VISIT');
      expect(variant.stayWindow).toBeUndefined();
      expect(variant.nightsMin).toBeUndefined();
    });
  });
});

describe('what providers use', () => {
  const usage = { services: { GROOMER: { kapiel: 3 } }, variants: { GROOMER: { kapiel: { maly: 2 } } }, addons: {}, features: { GROOMER: { 'bez-klatki': 1 } } };

  it('counts providers using an element', () => {
    const draft = document();
    expect(usageOf(usage, draft, { kind: 'service', category: 0, index: 0 })).toBe(3);
    expect(usageOf(usage, draft, { kind: 'variant', category: 0, service: 0, index: 0 })).toBe(2);
    expect(usageOf(usage, draft, { kind: 'feature', category: 0, index: 0 })).toBe(1);
    expect(usageOf(usage, draft, { kind: 'addon', category: 0, index: 0 })).toBe(0);
  });

  it('locks the key of an element that is published, not of a new one', () => {
    const published = document();
    const draft = document({ ...groomer(), services: [...groomer().services, newService(groomer(), false, 'Trymowanie')] });
    expect(isPublishedKey(published, draft, { kind: 'service', category: 0, index: 0 })).toBe(true);
    expect(isPublishedKey(published, draft, { kind: 'service', category: 0, index: 1 })).toBe(false);
  });
});

describe('names', () => {
  it('starts a weight range with no lower bound, the next one where the heaviest ends', () => {
    const byWeight: CatalogServiceDoc = { ...groomer().services[0], variantKind: 'WEIGHT', variants: [] };
    const first = addVariant(byWeight, false, 'Mały pies');
    expect(first.variants[0]).toMatchObject({ weightMin: null, weightMax: null });
    const second = addVariant({ ...first, variants: [{ ...first.variants[0], weightMax: 10 }] }, false, 'Duży pies');
    expect(second.variants[1]).toMatchObject({ weightMin: 10, weightMax: null });
  });

  it('tells a name already used at a level, ignoring case and spaces', () => {
    expect(nameTaken(' kąpiel ', [{ label: 'Kąpiel' }])).toBe(true);
    expect(nameTaken('Kąpiel XL', [{ label: 'Kąpiel' }])).toBe(false);
  });

  it('lists every element whose name was cleared', () => {
    const category = groomer();
    const draft = document({ ...category, services: [{ ...category.services[0], label: ' ', variants: [{ ...category.services[0].variants[0], label: '' }] }] });
    expect(unnamedNodes(draft)).toEqual([
      { kind: 'service', category: 0, index: 0 },
      { kind: 'variant', category: 0, service: 0, index: 0 },
    ]);
    expect(unnamedNodes(document())).toEqual([]);
  });
});

describe('issues point at their element', () => {
  it('finds the element an issue path names, falling back to its parent', () => {
    const draft = document();
    const issue = (path: string[]) => ({ path, field: null, code: 'c', message: 'm', detail: 'd' });
    expect(refForIssue(draft, issue(['GROOMER', 'services', 'kapiel', 'variants', 'maly']))).toEqual({ kind: 'variant', category: 0, service: 0, index: 0 });
    expect(refForIssue(draft, issue(['GROOMER', 'features', 'bez-klatki']))).toEqual({ kind: 'feature', category: 0, index: 0 });
    expect(refForIssue(draft, issue(['GROOMER', 'services', 'usunieta']))).toEqual({ kind: 'category', category: 0 });
    expect(refForIssue(draft, issue(['HOTEL']))).toBeNull();
  });
});
