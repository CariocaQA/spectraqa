-- Add cloud_id column to store Jira Cloud site ID for OAuth connections
ALTER TABLE public.jira_connections 
ADD COLUMN cloud_id TEXT;