-- Enhance profiles table with additional fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Enable realtime for reviews table (for live rating updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Create function to calculate average rating for a profile
CREATE OR REPLACE FUNCTION public.calculate_profile_rating(profile_id UUID)
RETURNS TABLE (
  avg_rating NUMERIC,
  total_reviews INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(stars), 0)::NUMERIC(3,2) as avg_rating,
    COUNT(*)::INTEGER as total_reviews
  FROM public.reviews
  WHERE reviewee_id = profile_id;
END;
$$;

-- Create trigger to update profile rating stats
CREATE OR REPLACE FUNCTION public.update_profile_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rating_data RECORD;
BEGIN
  -- Calculate new ratings for the affected profile
  SELECT * INTO rating_data
  FROM public.calculate_profile_rating(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.reviewee_id
      ELSE NEW.reviewee_id
    END
  );

  -- Update the profile
  UPDATE public.profiles
  SET 
    rating = rating_data.avg_rating,
    reviews_count = rating_data.total_reviews,
    updated_at = NOW()
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.reviewee_id
    ELSE NEW.reviewee_id
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for review changes
DROP TRIGGER IF EXISTS update_profile_ratings_trigger ON public.reviews;
CREATE TRIGGER update_profile_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_rating_stats();