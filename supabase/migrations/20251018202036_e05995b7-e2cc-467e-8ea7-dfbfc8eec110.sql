-- Add unique constraint to prevent duplicate reviews for the same offer
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_reviewer_offer_unique 
UNIQUE (reviewer_id, offer_id);

-- Update RLS policy to ensure reviewer participated in the offer
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;

CREATE POLICY "Users can create reviews" ON public.reviews
FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id 
  AND (
    (
      -- For offer reviews: offer must be completed AND reviewer participated
      offer_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM offers 
        WHERE offers.id = reviews.offer_id 
        AND offers.completed_at IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.offer_id = reviews.offer_id
        AND (conversations.creator_id = auth.uid() OR conversations.participant_id = auth.uid())
      )
    )
    OR
    (
      -- For barter reviews: user must be part of the barter
      barter_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM barters
        WHERE barters.id = reviews.barter_id 
        AND (barters.user_a_id = auth.uid() OR barters.user_b_id = auth.uid())
      )
    )
  )
);