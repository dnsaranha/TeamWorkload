import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface MCPToolResponse<T = any> {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  _meta?: {
    progressToken?: number;
  };
  data?: T;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
}

export interface CreateEventRequest {
  calendarId?: string;
  event: GoogleCalendarEvent;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface PatchEventRequest {
  calendarId?: string;
  eventId: string;
  event: Partial<GoogleCalendarEvent>;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface DeleteEventRequest {
  calendarId?: string;
  eventId: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface SyncEventsRequest {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
  syncToken?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
}

export interface SyncEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

// ============================================================================
// MCP Tool Call Helper
// ============================================================================

async function callMCPTool<T>(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('mcp-proxy', {
      body: {
        tool: toolName,
        arguments: args,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to call MCP tool');
    }

    return data as MCPToolResponse<T>;
  } catch (error) {
    console.error(`Error calling ${toolName}:`, error);
    throw error;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to create a new Google Calendar event
 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<GoogleCalendarEvent>, Error, CreateEventRequest>({
    mutationFn: async (request: CreateEventRequest) => {
      return callMCPTool<GoogleCalendarEvent>('GOOGLECALENDAR_CREATE_EVENT', {
        calendarId: request.calendarId || 'primary',
        event: request.event,
        sendUpdates: request.sendUpdates || 'none',
      });
    },
    onSuccess: () => {
      // Invalidate calendar events queries to refetch
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

/**
 * Hook to update an existing Google Calendar event
 */
export function usePatchCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<GoogleCalendarEvent>, Error, PatchEventRequest>({
    mutationFn: async (request: PatchEventRequest) => {
      return callMCPTool<GoogleCalendarEvent>('GOOGLECALENDAR_PATCH_EVENT', {
        calendarId: request.calendarId || 'primary',
        eventId: request.eventId,
        event: request.event,
        sendUpdates: request.sendUpdates || 'none',
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate specific event and list queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-event', variables.eventId] });
    },
  });
}

/**
 * Hook to delete a Google Calendar event
 */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<MCPToolResponse<void>, Error, DeleteEventRequest>({
    mutationFn: async (request: DeleteEventRequest) => {
      return callMCPTool<void>('GOOGLECALENDAR_DELETE_EVENT', {
        calendarId: request.calendarId || 'primary',
        eventId: request.eventId,
        sendUpdates: request.sendUpdates || 'none',
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate calendar events queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-event', variables.eventId] });
    },
  });
}

/**
 * Hook to sync events from Google Calendar
 */
export function useSyncCalendarEvents(request: SyncEventsRequest, enabled = true) {
  return useQuery<MCPToolResponse<SyncEventsResponse>, Error>({
    queryKey: ['calendar-events', request],
    queryFn: async () => {
      return callMCPTool<SyncEventsResponse>('GOOGLECALENDAR_SYNC_EVENTS', {
        calendarId: request.calendarId || 'primary',
        timeMin: request.timeMin,
        timeMax: request.timeMax,
        maxResults: request.maxResults || 250,
        pageToken: request.pageToken,
        syncToken: request.syncToken,
        showDeleted: request.showDeleted ?? false,
        singleEvents: request.singleEvents ?? true,
        orderBy: request.orderBy || 'startTime',
      });
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get a single calendar event by ID
 */
export function useCalendarEvent(eventId: string, calendarId = 'primary', enabled = true) {
  return useQuery<MCPToolResponse<GoogleCalendarEvent>, Error>({
    queryKey: ['calendar-event', eventId],
    queryFn: async () => {
      // Using sync with specific event ID filter
      const response = await callMCPTool<SyncEventsResponse>('GOOGLECALENDAR_SYNC_EVENTS', {
        calendarId,
        maxResults: 1,
        singleEvents: true,
      });

      // Filter for the specific event
      const event = response.data?.items.find((e) => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      return {
        ...response,
        data: event,
      };
    },
    enabled: enabled && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get upcoming events (next 7 days)
 */
export function useUpcomingEvents(calendarId = 'primary', enabled = true) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return useSyncCalendarEvents(
    {
      calendarId,
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    },
    enabled
  );
}

/**
 * Hook to get today's events
 */
export function useTodayEvents(calendarId = 'primary', enabled = true) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useSyncCalendarEvents(
    {
      calendarId,
      timeMin: today.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    },
    enabled
  );
}

/**
 * Hook to get events in a date range
 */
export function useEventsInRange(
  startDate: Date,
  endDate: Date,
  calendarId = 'primary',
  enabled = true
) {
  return useSyncCalendarEvents(
    {
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    },
    enabled
  );
}
