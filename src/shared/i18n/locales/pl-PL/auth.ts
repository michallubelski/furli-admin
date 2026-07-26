import type { TranslationNode } from '../../types';

export const auth: TranslationNode = {
  login: {
    title: 'Zaloguj się do panelu administratora',
    description: 'Zarządzaj weryfikacją placówek, subskrypcjami i platformą FURLI.',
    email: 'E-mail',
    password: 'Hasło',
    pending: 'Logowanie...',
    hint: 'Dostęp do panelu wymaga poprawnego e-maila i hasła administratora.',
  },
  messages: {
    sessionExpired: 'Sesja administratora wygasła. Zaloguj się ponownie.',
    loginFailed: 'Nie udało się zalogować. Spróbuj ponownie.',
    loggedOut: 'Sesja została zakończona. Zaloguj się ponownie, aby wejść do panelu.',
    loggedOutLocally: 'Wylogowano lokalnie. Backend nie potwierdził zamknięcia sesji.',
  },
};
