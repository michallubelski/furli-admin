// Furli's service catalog document, exactly as furli-backend stores and validates it
// (ServiceCatalogFileReader - the format of reference-data/service-catalog-v1.json). The backend
// rejects unknown properties, so nothing UI-only may be added to these objects.

export type VariantKind = 'WEIGHT' | 'NIGHTS' | 'DURATION' | 'CHOICE';
export type BookingMode = 'SLOT' | 'STAY';
export type VariantPriceUnit = 'VISIT' | 'NIGHT' | 'STAY';
export type AddonPriceUnit = 'ONCE' | 'PER_DAY';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ProfileFlag = 'ACCEPTS_REACTIVE_DOGS';

export const DAYS_OF_WEEK: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export interface CatalogGroupDoc {
  key: string;
  label: string;
  labelEn: string;
}

export interface CatalogAddonDoc {
  key: string;
  label: string;
  labelEn: string;
  group?: string | null;
  priceUnit: AddonPriceUnit;
  defaultDurationMinutes?: number | null;
}

export interface StayWindowDoc {
  minNights?: number | null;
  maxNights?: number | null;
  days?: DayOfWeek[] | null;
}

export interface CatalogVariantDoc {
  key: string;
  label: string;
  labelEn: string;
  weightMin?: number | null;
  weightMax?: number | null;
  nightsMin?: number | null;
  nightsMax?: number | null;
  durationMinutes?: number | null;
  priceUnit: VariantPriceUnit;
  stayWindow?: StayWindowDoc | null;
}

export interface CatalogServiceDoc {
  key: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  variantKind: VariantKind;
  bookingMode?: BookingMode | null;
  bookable?: boolean | null;
  variants: CatalogVariantDoc[];
  addonKeys?: string[] | null;
}

export interface CatalogFeatureDoc {
  key: string;
  label: string;
  labelEn: string;
  group: string;
  profileFlag?: ProfileFlag | null;
}

export interface CatalogCategoryDoc {
  type: string;
  label: string;
  labelEn: string;
  sharedAddons?: boolean | null;
  addonGroups?: CatalogGroupDoc[] | null;
  addons?: CatalogAddonDoc[] | null;
  services: CatalogServiceDoc[];
  featureGroups?: CatalogGroupDoc[] | null;
  features?: CatalogFeatureDoc[] | null;
}

export interface CatalogDocument {
  version: string;
  categories: CatalogCategoryDoc[];
}

// --- the admin API around the document (furli-backend ServiceCatalogAdminDtos)

export interface CatalogIssueDto {
  path: string[];
  field: string | null;
  code: string;
  message: string;
  detail: string;
}

export interface CatalogUsageDto {
  services: Record<string, Record<string, number>>;
  variants: Record<string, Record<string, Record<string, number>>>;
  addons: Record<string, Record<string, number>>;
  features: Record<string, Record<string, number>>;
}

export interface ServiceCatalogAdminState {
  published: { revision: number; version: string; publishedAt: string | null; publishedBy: string | null; document: CatalogDocument };
  draft: { revision: number; lockVersion: number; updatedAt: string; updatedBy: string | null; document: CatalogDocument; issues: CatalogIssueDto[] } | null;
  providerTypes: Array<{ type: string; stayBased: boolean }>;
  usage: CatalogUsageDto;
}

export interface CatalogRevisionDto {
  revision: number;
  version: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
  publishedAt: string | null;
  author: string | null;
}
