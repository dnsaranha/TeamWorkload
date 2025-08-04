import {
  userProfileService,
  type GoogleCalendarTokens,
} from "./userProfileService";

// Types for Google Calendar events
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface CalendarIntegrationEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: "meeting" | "task";
  attendees?: string[];
  source: "google" | "internal";
}

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

class GoogleCalendarService {
  private authConfig: GoogleAuthConfig;
  private readonly GOOGLE_AUTH_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_CALENDAR_API =
    "https://www.googleapis.com/calendar/v3";

  constructor() {
    this.authConfig = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      redirectUri:
        import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
        `${window.location.origin}/auth/google/callback`,
      scope:
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
    };
  }

  // Generate OAuth 2.0 authorization URL
  generateAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.authConfig.clientId,
      redirect_uri: this.authConfig.redirectUri,
      scope: this.authConfig.scope,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    });

    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  // Handle OAuth callback and exchange code for tokens
  async handleAuthCallback(code: string): Promise<boolean> {
    try {
      const response = await fetch(this.GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.authConfig.clientId,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "",
          code,
          grant_type: "authorization_code",
          redirect_uri: this.authConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to exchange code for tokens");
      }

      const tokenData = await response.json();

      const tokens: GoogleCalendarTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
      };

      // Store tokens securely
      userProfileService.storeGoogleTokens(tokens);

      // Get user info and update profile
      await this.updateUserProfile(tokens.access_token);

      return true;
    } catch (error) {
      console.error("Google Calendar authentication failed:", error);
      return false;
    }
  }

  // Update user profile with Google account info
  private async updateUserProfile(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.ok) {
        const userInfo = await response.json();
        await userProfileService.updateProfile({
          google_calendar_connected: true,
          google_calendar_email: userInfo.email,
          name: userInfo.name || "User Name",
          email: userInfo.email,
          avatar_url: userInfo.picture,
        });
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return userProfileService.isGoogleCalendarConnected();
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const tokens = userProfileService.getGoogleTokens();
      if (!tokens?.refresh_token) return null;

      const response = await fetch(this.GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.authConfig.clientId,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "",
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const tokenData = await response.json();

      const newTokens: GoogleCalendarTokens = {
        ...tokens,
        access_token: tokenData.access_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      };

      userProfileService.storeGoogleTokens(newTokens);
      return newTokens.access_token;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      return null;
    }
  }

  // Get valid access token
  private async getValidAccessToken(): Promise<string | null> {
    const tokens = userProfileService.getGoogleTokens();
    if (!tokens) return null;

    // Check if token is still valid
    if (Date.now() < tokens.expires_at - 60000) {
      // 1 minute buffer
      return tokens.access_token;
    }

    // Try to refresh the token
    return await this.refreshAccessToken();
  }

  // Get events from Google Calendar
  async getEvents(
    calendarId: string = "primary",
    timeMin?: Date,
    timeMax?: Date,
  ): Promise<CalendarIntegrationEvent[]> {
    if (!this.isAuthenticated()) {
      console.warn("Google Calendar not authenticated");
      return [];
    }

    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        console.warn("No valid access token available");
        return [];
      }

      const params = new URLSearchParams({
        calendarId,
        singleEvents: "true",
        orderBy: "startTime",
      });

      if (timeMin) {
        params.append("timeMin", timeMin.toISOString());
      }
      if (timeMax) {
        params.append("timeMax", timeMax.toISOString());
      }

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return (
        data.items?.map((event: GoogleCalendarEvent) =>
          this.transformGoogleEvent(event),
        ) || []
      );
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      return [];
    }
  }

  // Transform Google Calendar event to our format
  private transformGoogleEvent(
    event: GoogleCalendarEvent,
  ): CalendarIntegrationEvent {
    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date + "T00:00:00");

    const endDate = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date + "T23:59:59");

    return {
      id: event.id,
      title: event.summary || "Sem título",
      description: event.description,
      startDate,
      endDate,
      type: "meeting",
      attendees: event.attendees?.map((a) => a.email) || [],
      source: "google",
    };
  }

  // Create event in Google Calendar
  async createEvent(
    event: Omit<CalendarIntegrationEvent, "id" | "source">,
    calendarId: string = "primary",
  ): Promise<string | null> {
    if (!this.isAuthenticated()) {
      console.warn("Google Calendar not authenticated");
      return null;
    }

    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return null;

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: event.attendees?.map((email) => ({ email })),
      };

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const createdEvent = await response.json();
      return createdEvent.id;
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      return null;
    }
  }

  // Update event in Google Calendar
  async updateEvent(
    eventId: string,
    event: Partial<CalendarIntegrationEvent>,
    calendarId: string = "primary",
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      console.warn("Google Calendar not authenticated");
      return false;
    }

    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return false;

      const updateData: any = {};
      if (event.title) updateData.summary = event.title;
      if (event.description) updateData.description = event.description;
      if (event.startDate) {
        updateData.start = {
          dateTime: event.startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (event.endDate) {
        updateData.end = {
          dateTime: event.endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map((email) => ({ email }));
      }

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error updating Google Calendar event:", error);
      return false;
    }
  }

  // Delete event from Google Calendar
  async deleteEvent(
    eventId: string,
    calendarId: string = "primary",
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      console.warn("Google Calendar not authenticated");
      return false;
    }

    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return false;

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      return false;
    }
  }

  // Disconnect Google Calendar
  async disconnect(): Promise<void> {
    try {
      await userProfileService.disconnectGoogleCalendar();
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
    }
  }

  // Sync internal tasks to Google Calendar
  async syncTaskToCalendar(task: {
    id: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    employeeName?: string;
  }): Promise<string | null> {
    const calendarEvent: Omit<CalendarIntegrationEvent, "id" | "source"> = {
      title: `[Tarefa] ${task.name}`,
      description: `${task.description || ""}

Responsável: ${task.employeeName || "Não atribuído"}
Sincronizado do sistema de workload`,
      startDate: task.startDate,
      endDate: task.endDate,
      type: "task",
    };

    return await this.createEvent(calendarEvent);
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();

// Mock service for development/demo purposes
export class MockGoogleCalendarService {
  private mockEvents: CalendarIntegrationEvent[] = [
    {
      id: "mock-1",
      title: "Reunião de Planejamento",
      description: "Reunião semanal de planejamento da equipe",
      startDate: new Date(2024, 0, 15, 9, 0),
      endDate: new Date(2024, 0, 15, 10, 0),
      type: "meeting",
      attendees: ["joao@empresa.com", "maria@empresa.com"],
      source: "google",
    },
    {
      id: "mock-2",
      title: "Review de Código",
      description: "Revisão do código da nova funcionalidade",
      startDate: new Date(2024, 0, 16, 14, 0),
      endDate: new Date(2024, 0, 16, 15, 30),
      type: "meeting",
      attendees: ["pedro@empresa.com", "ana@empresa.com"],
      source: "google",
    },
    {
      id: "mock-3",
      title: "Apresentação para Cliente",
      description: "Apresentação do progresso do projeto",
      startDate: new Date(2024, 0, 17, 16, 0),
      endDate: new Date(2024, 0, 17, 17, 0),
      type: "meeting",
      attendees: ["cliente@empresa.com"],
      source: "google",
    },
  ];

  async getEvents(
    timeMin?: Date,
    timeMax?: Date,
  ): Promise<CalendarIntegrationEvent[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    let filteredEvents = this.mockEvents;

    if (timeMin) {
      filteredEvents = filteredEvents.filter(
        (event) => event.startDate >= timeMin,
      );
    }

    if (timeMax) {
      filteredEvents = filteredEvents.filter(
        (event) => event.endDate <= timeMax,
      );
    }

    return filteredEvents;
  }

  async createEvent(
    event: Omit<CalendarIntegrationEvent, "id" | "source">,
  ): Promise<string> {
    const newEvent: CalendarIntegrationEvent = {
      ...event,
      id: `mock-${Date.now()}`,
      source: "google",
    };

    this.mockEvents.push(newEvent);
    return newEvent.id;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<CalendarIntegrationEvent>,
  ): Promise<boolean> {
    const eventIndex = this.mockEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return false;

    this.mockEvents[eventIndex] = {
      ...this.mockEvents[eventIndex],
      ...updates,
    };
    return true;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const eventIndex = this.mockEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return false;

    this.mockEvents.splice(eventIndex, 1);
    return true;
  }
}

export const mockGoogleCalendarService = new MockGoogleCalendarService();
