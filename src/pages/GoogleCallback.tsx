import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Google authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get authorization code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        throw new Error(`Google OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Get user ID from session storage
      const userId = sessionStorage.getItem('google_oauth_user_id');
      if (!userId) {
        throw new Error('User session not found');
      }

      // Exchange code for tokens via Edge Function
      const { data, error: callbackError } = await supabase.functions.invoke('supabase-functions-google-oauth-callback', {
        body: { code, userId },
      });

      if (callbackError) {
        throw callbackError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to connect Google account');
      }

      // Clean up session storage
      sessionStorage.removeItem('google_oauth_user_id');

      setStatus('success');
      setMessage('Google account connected successfully!');

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Callback error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to connect Google account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            Google Authentication
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we connect your Google account...'}
            {status === 'success' && 'Your Google account has been connected!'}
            {status === 'error' && 'There was a problem connecting your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          {status === 'error' && (
            <Button
              onClick={() => navigate('/')}
              className="w-full mt-4"
            >
              Return to Home
            </Button>
          )}

          {status === 'success' && (
            <p className="text-sm text-gray-600 mt-4 text-center">
              Redirecting to home page...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleCallbackPage;
