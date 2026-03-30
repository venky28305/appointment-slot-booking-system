-- Copy and paste this code into your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.slots (
  slot_time TEXT PRIMARY KEY,
  is_booked BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS) if you plan on accessing it directly from a frontend later
-- ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: By default, if you use the backend endpoint, it bypasses RLS if you use the Service Role Key, 
-- but using the Anon Key in the backend requires policies.
-- Since this is a simple backend setup utilizing the anon key, let's create a blanket policy to allow all access.

DROP POLICY IF EXISTS "Allow all operations" ON public.slots;

CREATE POLICY "Allow all operations" 
ON public.slots 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled so the policy takes effect
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
