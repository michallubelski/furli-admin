import type { TranslationNode } from '../../types';

export const common: TranslationNode = {
  locale: {
    name: 'Polski',
    switcherLabel: 'Język',
    plPL: 'Polski',
    enUS: 'English',
  },
  actions: {
    back: 'Wróć',
    cancel: 'Anuluj',
    close: 'Zamknij',
    confirm: 'Potwierdź',
    continue: 'Dalej',
    create: 'Utwórz',
    decline: 'Odrzuć',
    delete: 'Usuń',
    disconnect: 'Rozłącz',
    edit: 'Edytuj',
    finish: 'Zakończ',
    goToDashboard: 'Przejdź do pulpitu',
    loadMore: 'Pokaż więcej',
    login: 'Zaloguj się',
    logout: 'Wyloguj',
    preview: 'Podgląd',
    publish: 'Opublikuj',
    refresh: 'Odśwież',
    save: 'Zapisz',
    search: 'Szukaj',
    send: 'Wyślij',
    suspend: 'Zawieś',
    restore: 'Przywróć',
    approve: 'Zatwierdź',
  },
  labels: {
    admin: 'Admin',
    loading: 'Ładowanie',
    source: 'Źródło',
    status: 'Status',
    today: 'Dziś',
  },
  states: {
    accessDenied: {
      title: 'Brak dostępu',
      description: 'Ta przestrzeń routingu nie jest przypisana do aktualnej roli użytkownika.',
    },
    unavailable: {
      title: 'Funkcja jeszcze niedostępna',
      fetchError: 'Nie udało się pobrać danych',
      permissions: 'Brak uprawnień',
      permissionsDescription: 'Backend odrzucił żądanie dla tej roli. Frontend traktuje to jako stan UX, a źródłem prawdy pozostaje API.',
    },
  },
  auth: {
    shellLabel: 'Admin',
  },
  formatting: {
    activeRole: 'Aktywna rola',
  },
  confirmDangerModal: {
    typeToConfirmLabel: 'Aby potwierdzić, wpisz:',
  },
};
