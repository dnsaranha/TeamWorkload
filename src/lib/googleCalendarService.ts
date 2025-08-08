// Stub implementation to prevent import errors
// Google Calendar integration has been removed

export const googleCalendarService = {
  isAuthenticated: () => false,
  getEvents: () => Promise.resolve([]),
  disconnect: () => Promise.resolve(),
  handleAuthCallback: () => Promise.resolve(false),
};

export const mockGoogleCalendarService = {
  getEvents: () => Promise.resolve([]),
};
