-- Create project_contexts table for project notes
CREATE TABLE IF NOT EXISTS public.project_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  jira_project_keys text[] NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS project_contexts_user_idx ON public.project_contexts(user_id);

-- Enable RLS
ALTER TABLE public.project_contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own projects
CREATE POLICY "project_contexts_select_own"
ON public.project_contexts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "project_contexts_insert_own"
ON public.project_contexts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "project_contexts_update_own"
ON public.project_contexts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "project_contexts_delete_own"
ON public.project_contexts
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_contexts_updated_at
BEFORE UPDATE ON public.project_contexts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();