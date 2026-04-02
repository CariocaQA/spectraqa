-- 1. Remover a view insegura
DROP VIEW IF EXISTS jira_connections_safe;

-- 2. Criar função segura que retorna apenas conexões do próprio usuário
CREATE OR REPLACE FUNCTION public.get_my_jira_connections()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  connection_type jira_connection_type,
  base_url text,
  email text,
  status connection_status,
  is_default boolean,
  token_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, name, connection_type, base_url, email, 
         status, is_default, token_expires_at, created_at, updated_at
  FROM jira_connections
  WHERE user_id = auth.uid();
$$;

-- 3. Atualizar políticas de jira_connections para authenticated
DROP POLICY IF EXISTS "Users can view own connections" ON jira_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON jira_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON jira_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON jira_connections;

CREATE POLICY "Users can view own connections" ON jira_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON jira_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON jira_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON jira_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Atualizar políticas de profiles para authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 5. Atualizar políticas de qa_artifacts para authenticated
DROP POLICY IF EXISTS "Users can view own artifacts" ON qa_artifacts;
DROP POLICY IF EXISTS "Users can insert own artifacts" ON qa_artifacts;
DROP POLICY IF EXISTS "Users can update own artifacts" ON qa_artifacts;
DROP POLICY IF EXISTS "Users can delete own artifacts" ON qa_artifacts;

CREATE POLICY "Users can view own artifacts" ON qa_artifacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own artifacts" ON qa_artifacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own artifacts" ON qa_artifacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own artifacts" ON qa_artifacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Atualizar políticas de user_roles para authenticated
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Only admins can insert roles" ON user_roles
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update roles" ON user_roles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles" ON user_roles
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 7. Corrigir políticas de qa_doc_chunks
DROP POLICY IF EXISTS "Authenticated can read chunks" ON qa_doc_chunks;
DROP POLICY IF EXISTS "Admin can insert chunks" ON qa_doc_chunks;
DROP POLICY IF EXISTS "Admin can update chunks" ON qa_doc_chunks;
DROP POLICY IF EXISTS "Admin can delete chunks" ON qa_doc_chunks;

CREATE POLICY "Authenticated can read chunks" ON qa_doc_chunks
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can insert chunks" ON qa_doc_chunks
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update chunks" ON qa_doc_chunks
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete chunks" ON qa_doc_chunks
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 8. Corrigir políticas de qa_documents
DROP POLICY IF EXISTS "Authenticated can read global docs" ON qa_documents;
DROP POLICY IF EXISTS "Admin can insert docs" ON qa_documents;
DROP POLICY IF EXISTS "Admin can update docs" ON qa_documents;
DROP POLICY IF EXISTS "Admin can delete docs" ON qa_documents;

CREATE POLICY "Authenticated can read global docs" ON qa_documents
  FOR SELECT TO authenticated USING (scope = 'global');
CREATE POLICY "Admin can insert docs" ON qa_documents
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update docs" ON qa_documents
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete docs" ON qa_documents
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));