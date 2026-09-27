import { describe, expect, it } from 'vitest';
import { catalogProviderTypes, emptyCatalogOverlay, FURLI_CATALOG_TYPES } from '../src/features/admin/catalog';

// The groomer, pet sitter, dog walker and hotel take their services and features from Furli's
// service catalog in furli-backend - the admin overlay has nothing to edit for them.

describe('admin catalog tabs', () => {
  it('leaves the Furli catalog types out of the services tabs', () => {
    const types = catalogProviderTypes('services', emptyCatalogOverlay());

    expect(types).toContain('veterinarian');
    expect(types).toContain('trainer');
    FURLI_CATALOG_TYPES.forEach((type) => expect(types).not.toContain(type));
  });

  it('leaves them out of the specialties tabs even with an entry added here', () => {
    const overlay = { ...emptyCatalogOverlay(), added: [{ id: 'x', type: 'groomer' as const, label: 'grooming bez klatki', sub: '' }] };

    expect(catalogProviderTypes('specialties', overlay)).not.toContain('groomer');
  });
});
