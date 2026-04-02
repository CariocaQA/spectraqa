-- Add last_login_at column to track user activity
ALTER TABLE public.profiles 
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;