-- Add completed_at timestamp to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update reviews table to make barter_id nullable and add offer_id
ALTER TABLE public.reviews 
  ALTER COLUMN barter_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE;

-- Create index for faster offer-based review queries
CREATE INDEX IF NOT EXISTS idx_reviews_offer_id ON public.reviews(offer_id);

-- Drop and recreate the review creation policy
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id 
  AND (
    -- Either via barter
    (barter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.barters 
      WHERE id = barter_id 
      AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
    ))
    OR
    -- Or via completed offer
    (offer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.offers 
      WHERE id = offer_id 
      AND completed_at IS NOT NULL
    ))
  )
);