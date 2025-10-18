-- Add image_url column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for offer images
CREATE POLICY "Offer images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'offer-images');

CREATE POLICY "Users can upload offer images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'offer-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own offer images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'offer-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own offer images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'offer-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);