-- Fix search_path security issue with CASCADE
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the triggers
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_offers_updated_at 
BEFORE UPDATE ON public.offers 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_barters_updated_at 
BEFORE UPDATE ON public.barters 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();