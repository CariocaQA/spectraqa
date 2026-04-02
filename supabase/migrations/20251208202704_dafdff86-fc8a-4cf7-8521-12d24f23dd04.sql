-- Fix RLS policies to require authentication

-- Drop and recreate profiles policies as PERMISSIVE with auth check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate jira_connections policies as PERMISSIVE with auth check
DROP POLICY IF EXISTS "Users can view own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.jira_connections;

CREATE POLICY "Users can view own connections" 
ON public.jira_connections 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" 
ON public.jira_connections 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" 
ON public.jira_connections 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" 
ON public.jira_connections 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);