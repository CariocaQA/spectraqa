-- 1. Recriar VIEW jira_connections_safe com SECURITY INVOKER
DROP VIEW IF EXISTS public.jira_connections_safe;

CREATE VIEW public.jira_connections_safe 
WITH (security_invoker = true) AS
SELECT 
  id, 
  user_id, 
  name, 
  connection_type, 
  base_url, 
  email, 
  status, 
  is_default, 
  token_expires_at, 
  created_at, 
  updated_at
FROM public.jira_connections;

-- Garantir acesso apenas para authenticated
REVOKE ALL ON public.jira_connections_safe FROM PUBLIC;
REVOKE ALL ON public.jira_connections_safe FROM anon;
GRANT SELECT ON public.jira_connections_safe TO authenticated;

-- 2. Adicionar políticas de escrita para user_roles (apenas admins)
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Adicionar política UPDATE para qa_artifacts
CREATE POLICY "Users can update own artifacts" ON public.qa_artifacts
  FOR UPDATE USING (auth.uid() = user_id);