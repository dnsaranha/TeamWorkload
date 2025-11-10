-- Create table to store Google OAuth tokens per user
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE google_oauth_tokens;

-- Function to check if token is expired
CREATE OR REPLACE FUNCTION is_google_token_expired(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  token_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expires_at INTO token_expires_at
  FROM google_oauth_tokens
  WHERE user_id = user_id_param;
  
  IF token_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN NOW() >= token_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
