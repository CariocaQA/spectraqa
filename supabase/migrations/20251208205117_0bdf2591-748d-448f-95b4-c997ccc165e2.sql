-- 1. Corrigir políticas RESTRICTIVE para PERMISSIVE na tabela profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Corrigir políticas RESTRICTIVE para PERMISSIVE na tabela jira_connections
DROP POLICY IF EXISTS "Users can view own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.jira_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.jira_connections;

CREATE POLICY "Users can view own connections" ON public.jira_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.jira_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.jira_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.jira_connections
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Revogar acesso do anon a todas as tabelas sensíveis
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.jira_connections FROM anon;
REVOKE ALL ON public.jira_connections_safe FROM anon;

-- 4. Garantir que apenas authenticated tenha acesso à view
REVOKE ALL ON public.jira_connections_safe FROM PUBLIC;
GRANT SELECT ON public.jira_connections_safe TO authenticated;