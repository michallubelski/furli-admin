import type { ProviderType } from '../types/furli';

// Two-level taxonomy (provider type -> specialty), ported from the mockup's
// `furli-specjalizacje.js` (same source already ported into furli-fronted's
// shared/constants/specialties.ts). `group` is a display label for grouping a long list, not a
// navigation level - every specialty is directly selectable.
export interface SpecialtyOption {
  id: string;
  label: string;
  group: string;
}

export const VET_SPECIALTIES: SpecialtyOption[] = [
  { id: 'internista', label: 'Internista', group: 'Najczęściej szukane' },
  { id: 'chirurg', label: 'Chirurg', group: 'Najczęściej szukane' },
  { id: 'dermatolog', label: 'Dermatolog', group: 'Najczęściej szukane' },
  { id: 'stomatolog', label: 'Stomatolog', group: 'Najczęściej szukane' },
  { id: 'ortopeda', label: 'Ortopeda', group: 'Najczęściej szukane' },
  { id: 'okulista', label: 'Okulista', group: 'Najczęściej szukane' },

  { id: 'kardiolog', label: 'Kardiolog', group: 'Specjalizacje narządowe' },
  { id: 'neurolog', label: 'Neurolog', group: 'Specjalizacje narządowe' },
  { id: 'nefrolog', label: 'Nefrolog', group: 'Specjalizacje narządowe' },
  { id: 'urolog', label: 'Urolog', group: 'Specjalizacje narządowe' },
  { id: 'endokrynolog', label: 'Endokrynolog', group: 'Specjalizacje narządowe' },
  { id: 'laryngolog', label: 'Laryngolog', group: 'Specjalizacje narządowe' },
  { id: 'onkolog', label: 'Onkolog', group: 'Specjalizacje narządowe' },
  { id: 'rozrod', label: 'Rozród', group: 'Specjalizacje narządowe' },

  { id: 'diagnosta-obrazowy', label: 'Diagnosta obrazowy', group: 'Diagnostyka i zabiegi' },
  { id: 'radiolog', label: 'Radiolog', group: 'Diagnostyka i zabiegi' },
  { id: 'usg', label: 'USG', group: 'Diagnostyka i zabiegi' },
  { id: 'patolog', label: 'Patolog', group: 'Diagnostyka i zabiegi' },
  { id: 'anestezjolog', label: 'Anestezjolog', group: 'Diagnostyka i zabiegi' },
  { id: 'terapia-bolu', label: 'Terapia bólu', group: 'Diagnostyka i zabiegi' },
];

export const TRAINER_SPECIALTIES: SpecialtyOption[] = [
  { id: 'behawiorysta', label: 'Behawiorysta', group: 'Zachowanie' },
  { id: 'behawiorysta-agresja', label: 'Behawiorysta — psy agresywne', group: 'Zachowanie' },
  { id: 'behawiorysta-lek', label: 'Behawiorysta — psy lękowe', group: 'Zachowanie' },
  { id: 'przedszkole', label: 'Przedszkole / trening szczeniąt', group: 'Zachowanie' },
  { id: 'posluszenstwo', label: 'Posłuszeństwo codzienne', group: 'Zachowanie' },

  { id: 'trening-medyczny', label: 'Trening medyczny', group: 'Zdrowie i sprawność' },
  { id: 'fitness', label: 'Fitness i motoryka', group: 'Zdrowie i sprawność' },
  { id: 'handling', label: 'Przygotowanie handlingowe', group: 'Zdrowie i sprawność' },

  { id: 'nosework', label: 'Nosework', group: 'Praca węchowa' },
  { id: 'tropienie', label: 'Tropienie', group: 'Praca węchowa' },

  { id: 'obedience', label: 'Obedience', group: 'Sporty psie' },
  { id: 'agility', label: 'Agility', group: 'Sporty psie' },
  { id: 'rally-o', label: 'Rally-O', group: 'Sporty psie' },
  { id: 'flyball', label: 'Flyball', group: 'Sporty psie' },
  { id: 'frisbee', label: 'Frisbee', group: 'Sporty psie' },
  { id: 'dog-dancing', label: 'Dog dancing', group: 'Sporty psie' },
  { id: 'mondioring', label: 'Mondioring', group: 'Sporty psie' },
  { id: 'igp', label: 'IGP', group: 'Sporty psie' },
];

// Groomer/petsitter/dog walker don't get specialties - their price list already describes their
// range, and slicing it further would create categories with two facilities per city.
export const SPECIALTIES_BY_TYPE: Record<ProviderType, SpecialtyOption[]> = {
  veterinarian: VET_SPECIALTIES,
  trainer: TRAINER_SPECIALTIES,
  groomer: [],
  petsitter: [],
  walker: [],
};
