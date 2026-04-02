-- 1. Criar view segura sem colunas de tokens
CREATE OR REPLACE VIEW public.jira_connections_safe AS
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

-- 2. Habilitar security_invoker para que RLS da tabela base seja respeitado
ALTER VIEW public.jira_connections_safe SET (security_invoker = on);

-- 3. Revogar acesso SELECT direto à tabela para authenticated
REVOKE SELECT ON public.jira_connections FROM authenticated;

-- 4. Conceder acesso à view para authenticated
GRANT SELECT ON public.jira_connections_safe TO authenticated;

-- 5. Garantir que service_role mantém acesso total à tabela original (para Edge Functions)
GRANT ALL ON public.jira_connections TO service_role;