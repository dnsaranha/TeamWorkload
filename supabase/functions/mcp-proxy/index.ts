import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { tool, arguments: args } = await req.json();

    // Get user's Google OAuth token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Google account not connected. Please connect your Google account first.',
            },
          ],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    if (now >= expiresAt && tokenData.refresh_token) {
      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Google token');
      }

      const refreshData: GoogleTokenResponse = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      await supabaseClient
        .from('google_oauth_tokens')
        .update({
          access_token: refreshData.access_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Route to appropriate Google API based on tool name
    let result;

    if (tool.startsWith('GOOGLECALENDAR_')) {
      result = await handleCalendarTool(tool, args, accessToken);
    } else if (tool.startsWith('GOOGLETASKS_')) {
      result = await handleTasksTool(tool, args, accessToken);
    } else {
      throw new Error(`Unknown tool: ${tool}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MCP Proxy Error:', error);
    return new Response(
      JSON.stringify({
        isError: true,
        content: [
          {
            type: 'text',
            text: error.message || 'An error occurred',
          },
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Google Calendar API handlers
async function handleCalendarTool(tool: string, args: any, accessToken: string) {
  const calendarId = args.calendarId || 'primary';
  const baseUrl = 'https://www.googleapis.com/calendar/v3';

  switch (tool) {
    case 'GOOGLECALENDAR_CREATE_EVENT': {
      const response = await fetch(`${baseUrl}/calendars/${calendarId}/events?sendUpdates=${args.sendUpdates || 'none'}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args.event),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Event created successfully' }],
        data,
      };
    }

    case 'GOOGLECALENDAR_PATCH_EVENT': {
      const response = await fetch(
        `${baseUrl}/calendars/${calendarId}/events/${args.eventId}?sendUpdates=${args.sendUpdates || 'none'}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(args.event),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update event: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Event updated successfully' }],
        data,
      };
    }

    case 'GOOGLECALENDAR_DELETE_EVENT': {
      const response = await fetch(
        `${baseUrl}/calendars/${calendarId}/events/${args.eventId}?sendUpdates=${args.sendUpdates || 'none'}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${await response.text()}`);
      }

      return {
        content: [{ type: 'text', text: 'Event deleted successfully' }],
      };
    }

    case 'GOOGLECALENDAR_SYNC_EVENTS': {
      const params = new URLSearchParams({
        timeMin: args.timeMin,
        timeMax: args.timeMax,
        maxResults: args.maxResults?.toString() || '250',
        singleEvents: args.singleEvents?.toString() || 'true',
        orderBy: args.orderBy || 'startTime',
      });

      if (args.pageToken) params.append('pageToken', args.pageToken);
      if (args.syncToken) params.append('syncToken', args.syncToken);
      if (args.showDeleted !== undefined) params.append('showDeleted', args.showDeleted.toString());

      const response = await fetch(`${baseUrl}/calendars/${calendarId}/events?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to sync events: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Events synced successfully' }],
        data: {
          items: data.items || [],
          nextPageToken: data.nextPageToken,
          nextSyncToken: data.nextSyncToken,
        },
      };
    }

    default:
      throw new Error(`Unknown calendar tool: ${tool}`);
  }
}

// Google Tasks API handlers
async function handleTasksTool(tool: string, args: any, accessToken: string) {
  const baseUrl = 'https://tasks.googleapis.com/tasks/v1';

  switch (tool) {
    case 'GOOGLETASKS_LIST_TASK_LISTS': {
      const params = new URLSearchParams({
        maxResults: args.maxResults?.toString() || '100',
      });

      if (args.pageToken) params.append('pageToken', args.pageToken);

      const response = await fetch(`${baseUrl}/users/@me/lists?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list task lists: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Task lists retrieved successfully' }],
        data: {
          items: data.items || [],
          nextPageToken: data.nextPageToken,
        },
      };
    }

    case 'GOOGLETASKS_LIST_TASKS': {
      const params = new URLSearchParams({
        maxResults: args.maxResults?.toString() || '100',
      });

      if (args.pageToken) params.append('pageToken', args.pageToken);
      if (args.showCompleted !== undefined) params.append('showCompleted', args.showCompleted.toString());
      if (args.showDeleted !== undefined) params.append('showDeleted', args.showDeleted.toString());
      if (args.showHidden !== undefined) params.append('showHidden', args.showHidden.toString());
      if (args.dueMin) params.append('dueMin', args.dueMin);
      if (args.dueMax) params.append('dueMax', args.dueMax);
      if (args.updatedMin) params.append('updatedMin', args.updatedMin);
      if (args.completedMin) params.append('completedMin', args.completedMin);
      if (args.completedMax) params.append('completedMax', args.completedMax);

      const response = await fetch(`${baseUrl}/lists/${args.taskListId}/tasks?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list tasks: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Tasks retrieved successfully' }],
        data: {
          items: data.items || [],
          nextPageToken: data.nextPageToken,
        },
      };
    }

    case 'GOOGLETASKS_INSERT_TASK': {
      const params = new URLSearchParams();
      if (args.parent) params.append('parent', args.parent);
      if (args.previous) params.append('previous', args.previous);

      const response = await fetch(`${baseUrl}/lists/${args.taskListId}/tasks?${params}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args.task),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Task created successfully' }],
        data,
      };
    }

    case 'GOOGLETASKS_PATCH_TASK': {
      const response = await fetch(`${baseUrl}/lists/${args.taskListId}/tasks/${args.taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args.task),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${await response.text()}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: 'Task updated successfully' }],
        data,
      };
    }

    case 'GOOGLETASKS_DELETE_TASK': {
      const response = await fetch(`${baseUrl}/lists/${args.taskListId}/tasks/${args.taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${await response.text()}`);
      }

      return {
        content: [{ type: 'text', text: 'Task deleted successfully' }],
      };
    }

    default:
      throw new Error(`Unknown tasks tool: ${tool}`);
  }
}
