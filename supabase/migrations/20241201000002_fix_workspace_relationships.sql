-- First, populate public.users with existing auth.users data
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.created_at,
  au.updated_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  updated_at = EXCLUDED.updated_at;

-- Now add the foreign key constraint for workspace_members
ALTER TABLE workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add the foreign key constraint for current_workspace_id
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_current_workspace_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_current_workspace_id_fkey 
FOREIGN KEY (current_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_current_workspace ON public.users(current_workspace_id);

-- Update the function to handle user profile creation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the workspace creation function
CREATE OR REPLACE FUNCTION public.create_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Only create workspace if user doesn't have one
  IF NEW.current_workspace_id IS NULL THEN
    -- Create a default workspace for the new user
    INSERT INTO workspaces (name, description, owner_id)
    VALUES (
      COALESCE(NEW.full_name, 'Meu Workspace') || '''s Workspace',
      'Workspace padrão criado automaticamente',
      NEW.id
    )
    RETURNING id INTO workspace_id;
    
    -- Add user as owner of the workspace
    INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at)
    VALUES (workspace_id, NEW.id, 'owner', 'active', NOW());
    
    -- Set as current workspace
    UPDATE public.users 
    SET current_workspace_id = workspace_id 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for workspace creation
DROP TRIGGER IF EXISTS on_user_profile_created ON public.users;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_workspace();