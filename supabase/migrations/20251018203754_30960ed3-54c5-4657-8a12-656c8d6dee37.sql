-- Add match functionality to conversations
ALTER TABLE conversations
ADD COLUMN matched BOOLEAN DEFAULT false,
ADD COLUMN matched_by UUID[] DEFAULT '{}';

-- Create index for matched_by array queries
CREATE INDEX idx_conversations_matched_by ON conversations USING GIN(matched_by);