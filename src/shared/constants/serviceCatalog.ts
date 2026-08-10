import type { ProviderType } from '../types/furli';

// Closed, per-type service-name catalog, ported from the mockup's `furli-uslugi.js` (same source
// already ported into furli-fronted's shared/constants/serviceCatalog.ts - the provider panel
// picks a name from this list instead of typing one). The name is the search key the client app
// matches on, so a free-text field would produce "Strzyżenie" / "strzyzenie psa" / "STRZYŻENIE +
// kąpiel" as three unrelated, unsearchable entries for what is really one service - which is why
// this admin screen exists at all: someone has to own the closed list.
export interface ServiceCatalogEntry {
  key: string;
  name: string;
  desc: string;
  min: number;
}

export const SERVICE_CATALOG_BASE: Record<ProviderType, ServiceCatalogEntry[]> = {
  veterinarian: [
    { key: 'wizyta-kontrolna', name: 'Wizyta kontrolna', desc: 'Badanie ogólne', min: 30 },
    { key: 'szczepienie', name: 'Szczepienie', desc: 'Z przeglądem zdrowia', min: 20 },
    { key: 'odrobaczanie', name: 'Odrobaczanie', desc: 'Profilaktyka przeciwpasożytnicza', min: 15 },
    { key: 'badania-krwi', name: 'Badania krwi', desc: 'Morfologia i biochemia', min: 25 },
    { key: 'konsultacja-specjalistyczna', name: 'Konsultacja specjalistyczna', desc: 'Diagnostyka pogłębiona', min: 45 },
    { key: 'sterylizacja', name: 'Sterylizacja / kastracja', desc: 'Zabieg z hospitalizacją dzienną', min: 90 },
    { key: 'chip-paszport', name: 'Chipowanie i paszport', desc: 'Znakowanie i dokumenty', min: 20 },
    { key: 'usg', name: 'USG', desc: 'Badanie obrazowe jamy brzusznej', min: 30 },
    { key: 'stomatologia', name: 'Zabieg stomatologiczny', desc: 'Skaling i higiena jamy ustnej', min: 60 },
    { key: 'wizyta-domowa', name: 'Wizyta domowa', desc: 'Dojazd do opiekuna', min: 45 },
  ],
  groomer: [
    { key: 'kapiel-szczotkowanie', name: 'Kąpiel i szczotkowanie', desc: 'Mycie, suszenie, rozczesywanie', min: 60 },
    { key: 'strzyzenie', name: 'Strzyżenie wg rasy', desc: 'Modelowanie sylwetki', min: 90 },
    { key: 'obciecie-pazurow', name: 'Obcięcie pazurów', desc: 'Krótki zabieg pielęgnacyjny', min: 15 },
    { key: 'czyszczenie-uszu', name: 'Czyszczenie uszu', desc: 'Higiena małżowin', min: 15 },
    { key: 'wyczesywanie-podszerstka', name: 'Wyczesywanie podszerstka', desc: 'Usuwanie martwego włosa', min: 60 },
    { key: 'trymowanie', name: 'Trymowanie', desc: 'Pielęgnacja szorstkowłosych', min: 90 },
    { key: 'kapiel-lecznicza', name: 'Kąpiel lecznicza', desc: 'Szampony na zlecenie weterynarza', min: 60 },
  ],
  trainer: [
    { key: 'trening-indywidualny', name: 'Trening indywidualny', desc: 'Sesja 1:1', min: 60 },
    { key: 'konsultacja-behawioralna', name: 'Konsultacja behawioralna', desc: 'Ocena i plan pracy', min: 60 },
    { key: 'trening-posluszenstwa', name: 'Trening posłuszeństwa', desc: 'Podstawowe komendy', min: 60 },
    { key: 'nauka-na-smyczy', name: 'Nauka chodzenia na smyczy', desc: 'Praca nad chodzeniem przy nodze', min: 45 },
    { key: 'socjalizacja-szczeniat', name: 'Socjalizacja szczeniąt', desc: 'Zajęcia dla młodych psów', min: 60 },
    { key: 'szkolenie-grupowe', name: 'Szkolenie grupowe', desc: 'Zajęcia w małej grupie', min: 90 },
  ],
  petsitter: [
    { key: 'opieka-dzienna', name: 'Opieka dzienna', desc: 'Opieka i zabawa', min: 120 },
    { key: 'wyprowadzanie', name: 'Wyprowadzanie', desc: 'Spacer z pupilem', min: 60 },
    { key: 'opieka-w-domu', name: 'Opieka w domu klienta', desc: 'Wizyty u pupila', min: 90 },
    { key: 'nocleg', name: 'Nocleg', desc: 'Opieka całodobowa', min: 720 },
    { key: 'karmienie-leki', name: 'Karmienie i podawanie leków', desc: 'Według zaleceń weterynarza', min: 30 },
    { key: 'transport', name: 'Transport do placówki', desc: 'Dowóz na wizytę', min: 60 },
  ],
  // The mockup's own SERVICE_CATALOG_BASE has no "dogwalker" key at all (only veterinarian/groomer/
  // trainer/petsitter) even though SPECIALIST_TYPES lists dog walker as its own type - ported as-is
  // (an empty list), matching furli-fronted's identical treatment of the same source gap.
  walker: [],
};

// Mirrors the backend's slug rules for a catalog entry key: lowercase, Polish diacritics folded,
// non-alphanumeric runs collapsed to a single hyphen, no leading/trailing hyphen.
export function serviceKeyFromName(name: string): string {
  const DIACRITICS: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ż: 'z', ź: 'z' };
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśżź]/g, (char) => DIACRITICS[char] || char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
