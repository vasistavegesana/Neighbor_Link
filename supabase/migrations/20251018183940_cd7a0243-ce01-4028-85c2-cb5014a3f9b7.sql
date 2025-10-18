-- Add foreign key from messages to profiles
ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add avatar_url column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;