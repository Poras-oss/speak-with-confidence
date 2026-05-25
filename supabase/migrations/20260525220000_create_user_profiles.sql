-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  extempore_count INTEGER DEFAULT 0,
  last_extempore_date TEXT
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) FOR PRODUCTION
-- ==========================================
-- Note: You are using Clerk for Auth. To securely use RLS in production,
-- you will need to pass the Clerk JWT token to your Supabase client and
-- use a custom function to read the user_id from the JWT.
-- 
-- If you have not yet configured the Clerk + Supabase integration, 
-- leave the lines below commented out. Otherwise, your frontend 
-- requests will be blocked by RLS.
-- 
-- When you are ready to secure your database, uncomment the following:

/*
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (request.jwt.claim('sub') = user_id);

-- Policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (request.jwt.claim('sub') = user_id);

-- Policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (request.jwt.claim('sub') = user_id);
*/
