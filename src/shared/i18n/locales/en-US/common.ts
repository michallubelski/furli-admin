import type { TranslationNode } from '../../types';

export const common: TranslationNode = {
  locale: {
    name: 'English',
    switcherLabel: 'Language',
    plPL: 'Polski',
    enUS: 'English',
  },
  actions: {
    back: 'Back',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    continue: 'Continue',
    create: 'Create',
    decline: 'Decline',
    delete: 'Delete',
    disconnect: 'Disconnect',
    edit: 'Edit',
    finish: 'Finish',
    goToDashboard: 'Go to dashboard',
    loadMore: 'Show more',
    login: 'Log in',
    logout: 'Log out',
    preview: 'Preview',
    publish: 'Publish',
    refresh: 'Refresh',
    save: 'Save',
    search: 'Search',
    send: 'Send',
    suspend: 'Suspend',
    restore: 'Restore',
    approve: 'Approve',
  },
  labels: {
    admin: 'Admin',
    loading: 'Loading',
    source: 'Source',
    status: 'Status',
    today: 'Today',
  },
  states: {
    accessDenied: {
      title: 'Access denied',
      description: 'This route space is not assigned to the current user role.',
    },
    unavailable: {
      title: 'This feature is not available yet',
      fetchError: 'Failed to load data',
      permissions: 'Insufficient permissions',
      permissionsDescription: 'The backend rejected the request for this role. The frontend treats it as a UX state and the API remains the source of truth.',
    },
  },
  auth: {
    shellLabel: 'Admin',
  },
  formatting: {
    activeRole: 'Active role',
  },
  confirmDangerModal: {
    typeToConfirmLabel: 'To confirm, type:',
  },
};
