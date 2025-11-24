-- Create scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('url', 'file')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  vulnerabilities_count INTEGER DEFAULT 0,
  severity TEXT CHECK (severity IN ('safe', 'warning', 'danger')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scans"
  ON public.scans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans"
  ON public.scans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON public.scans
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
  ON public.scans
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add scan count to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scans_this_month INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_scan_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to reset scan count monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_scans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_scan_reset IS NULL OR 
     (EXTRACT(MONTH FROM NEW.last_scan_reset) != EXTRACT(MONTH FROM NOW()) OR
      EXTRACT(YEAR FROM NEW.last_scan_reset) != EXTRACT(YEAR FROM NOW())) THEN
    NEW.scans_this_month := 0;
    NEW.last_scan_reset := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to reset scans monthly
CREATE TRIGGER reset_scans_monthly
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_scans();

-- Function to increment scan count
CREATE OR REPLACE FUNCTION public.increment_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET scans_this_month = scans_this_month + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to increment scan count
CREATE TRIGGER increment_scan_count_trigger
  AFTER INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_scan_count();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);