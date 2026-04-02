-- Block anonymous (unauthenticated) access to profiles table
-- This prevents any queries from the 'anon' role to the profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);