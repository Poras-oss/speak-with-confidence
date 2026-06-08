-- Create the session_history table
CREATE TABLE IF NOT EXISTS public.session_history (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  date BIGINT NOT NULL,
  mode TEXT NOT NULL,
  question TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  feedback JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) FOR PRODUCTION
-- ==========================================
-- When you are ready to secure your database, uncomment the following:

/*
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own history
CREATE POLICY "Users can view their own history" 
ON public.session_history 
FOR SELECT 
USING (request.jwt.claim('sub') = user_id);

-- Policy to allow users to insert their own history
CREATE POLICY "Users can insert their own history" 
ON public.session_history 
FOR INSERT 
WITH CHECK (request.jwt.claim('sub') = user_id);

-- Policy to allow users to delete their own history
CREATE POLICY "Users can delete their own history" 
ON public.session_history 
FOR DELETE
USING (request.jwt.claim('sub') = user_id);
*/
