-- Drop the old reviews INSERT policy
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;

-- Create new policy that only requires completed offers (no matching requirement)
CREATE POLICY "Users can create reviews" ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id 
  AND (
    -- For offer-based reviews: must have participated in conversation and offer is completed
    (
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
    -- For barter-based reviews: must be part of the barter
    OR (
      barter_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM barters
        WHERE barters.id = reviews.barter_id 
        AND (barters.user_a_id = auth.uid() OR barters.user_b_id = auth.uid())
      )
    )
  )
);