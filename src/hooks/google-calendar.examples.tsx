import React, { useState } from 'react';
import {
  useCreateCalendarEvent,
  usePatchCalendarEvent,
  useDeleteCalendarEvent,
  useSyncCalendarEvents,
  useUpcomingEvents,
  useTodayEvents,
  useEventsInRange,
  GoogleCalendarEvent,
} from './google-calendar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

/**
 * Example component demonstrating Google Calendar hooks usage
 */
export function GoogleCalendarExample() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // ============================================================================
  // Mutations
  // ============================================================================

  const createEvent = useCreateCalendarEvent();
  const patchEvent = usePatchCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  // ============================================================================
  // Queries
  // ============================================================================

  // Get upcoming events (next 7 days)
  const { data: upcomingEvents, isLoading: loadingUpcoming } = useUpcomingEvents();

  // Get today's events
  const { data: todayEvents, isLoading: loadingToday } = useTodayEvents();

  // Get events in a custom date range
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);
  const { data: rangeEvents } = useEventsInRange(startDate, endDate);

  // Sync all events with custom parameters
  const { data: allEvents } = useSyncCalendarEvents({
    calendarId: 'primary',
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateEvent = async () => {
    try {
      const newEvent: GoogleCalendarEvent = {
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Conference Room A',
        start: {
          dateTime: '2024-03-20T10:00:00',
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: '2024-03-20T11:00:00',
          timeZone: 'America/New_York',
        },
        attendees: [
          { email: 'team@example.com' },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const result = await createEvent.mutateAsync({
        event: newEvent,
        sendUpdates: 'all',
      });

      console.log('Event created:', result);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleUpdateEvent = async (eventId: string) => {
    try {
      const result = await patchEvent.mutateAsync({
        eventId,
        event: {
          summary: 'Updated Team Meeting',
          description: 'Updated description',
        },
        sendUpdates: 'all',
      });

      console.log('Event updated:', result);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent.mutateAsync({
        eventId,
        sendUpdates: 'all',
      });

      console.log('Event deleted');
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold">Google Calendar Hooks Example</h1>

      {/* Create Event Section */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Create Event</h2>
        <Button
          onClick={handleCreateEvent}
          disabled={createEvent.isPending}
        >
          {createEvent.isPending ? 'Creating...' : 'Create Sample Event'}
        </Button>
        {createEvent.isError && (
          <p className="text-red-500 mt-2">Error: {createEvent.error.message}</p>
        )}
        {createEvent.isSuccess && (
          <p className="text-green-500 mt-2">Event created successfully!</p>
        )}
      </Card>

      {/* Today's Events */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Today's Events</h2>
        {loadingToday ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {todayEvents?.data?.items.map((event) => (
              <div key={event.id} className="border p-3 rounded">
                <h3 className="font-semibold">{event.summary}</h3>
                <p className="text-sm text-gray-600">
                  {event.start.dateTime || event.start.date}
                </p>
                <div className="mt-2 space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => event.id && handleUpdateEvent(event.id)}
                  >
                    Update
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => event.id && handleDeleteEvent(event.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {todayEvents?.data?.items.length === 0 && (
              <p className="text-gray-500">No events today</p>
            )}
          </div>
        )}
      </Card>

      {/* Upcoming Events */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Upcoming Events (Next 7 Days)</h2>
        {loadingUpcoming ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents?.data?.items.map((event) => (
              <div key={event.id} className="border p-3 rounded">
                <h3 className="font-semibold">{event.summary}</h3>
                <p className="text-sm text-gray-600">
                  {event.start.dateTime || event.start.date}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-500">📍 {event.location}</p>
                )}
              </div>
            ))}
            {upcomingEvents?.data?.items.length === 0 && (
              <p className="text-gray-500">No upcoming events</p>
            )}
          </div>
        )}
      </Card>

      {/* All Events */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">All Events</h2>
        <div className="space-y-2">
          {allEvents?.data?.items.slice(0, 10).map((event) => (
            <div key={event.id} className="border p-3 rounded">
              <h3 className="font-semibold">{event.summary}</h3>
              <p className="text-sm text-gray-600">
                {event.start.dateTime || event.start.date}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
