import type { TranslationNode } from '../../types';

export const auth: TranslationNode = {
  login: {
    title: 'Log in to the admin panel',
    description: 'Manage provider verification, subscriptions, and the FURLI platform.',
    email: 'Email',
    password: 'Password',
    pending: 'Logging in...',
    hint: 'Access to the panel requires a valid administrator email and password.',
  },
  messages: {
    sessionExpired: 'Your admin session has expired. Please log in again.',
    loginFailed: 'Could not log in. Please try again.',
    loggedOut: 'Your session has ended. Log in again to access the panel.',
    loggedOutLocally: 'Logged out locally. The backend did not confirm the session was closed.',
  },
};
