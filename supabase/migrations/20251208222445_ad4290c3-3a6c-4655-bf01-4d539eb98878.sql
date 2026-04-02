-- Grant all necessary permissions to authenticated role on jira_connections
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_connections TO anon;