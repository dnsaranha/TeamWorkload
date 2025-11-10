import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Calendar, ListTodo } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface GoogleAuthCallbackProps {
  onSuccess?: () => void;
}

const GoogleAuthCallback: React.FC<GoogleAuthCallbackProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setIsConnected(true);
        setTokenInfo(data);
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  };

  const handleGoogleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get Google OAuth URL from environment or construct it
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        throw new Error('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.');
      }

      const redirectUri = `${window.location.origin}/google-callback`;
      const scope = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scope);
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');

      // Store current user ID in session storage for callback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        sessionStorage.setItem('google_oauth_user_id', user.id);
      }

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google connection');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('google_oauth_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setTokenInfo(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Google account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Integration
        </CardTitle>
        <CardDescription>
          Connect your Google account to sync Calendar and Tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Google account connected successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Connected Services:</p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Google Calendar
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ListTodo className="h-3 w-3" />
                  Google Tasks
                </Badge>
              </div>
            </div>

            {tokenInfo && (
              <div className="text-xs text-gray-500">
                <p>Connected: {new Date(tokenInfo.created_at).toLocaleDateString()}</p>
                <p>Expires: {new Date(tokenInfo.expires_at).toLocaleDateString()}</p>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect Google Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Google account to enable:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Sync calendar events</li>
              <li>Manage Google Tasks</li>
              <li>Two-way synchronization</li>
            </ul>

            <Button
              onClick={handleGoogleConnect}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect with Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAuthCallback;