/*
  # Add support for anonymous questions

  1. Schema Changes
    - Add `asker_name` column to questions table for non-authenticated users
    - Add `is_anonymous` column to questions table
    - Make `author_id` nullable to support anonymous questions
    - Update RLS policies to allow anonymous question creation

  2. Security
    - Update RLS policies to allow anyone to create questions
    - Maintain read access for all questions
*/

-- Add new columns to questions table
DO $$
BEGIN
  -- Add asker_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'asker_name'
  ) THEN
    ALTER TABLE questions ADD COLUMN asker_name TEXT;
  END IF;

  -- Add is_anonymous column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE questions ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Make author_id nullable to support anonymous questions
ALTER TABLE questions ALTER COLUMN author_id DROP NOT NULL;

-- Update RLS policies to allow anonymous question creation
DROP POLICY IF EXISTS "Authenticated users can create questions" ON questions;

-- Allow anyone (authenticated or not) to create questions
CREATE POLICY "Anyone can create questions"
  ON questions
  FOR INSERT
  WITH CHECK (true);

-- Keep existing policies for other operations
-- (Anyone can read questions - already exists)
-- (Users can update their own questions - already exists)
-- (Users can delete their own questions - already exists)

-- Add index for better performance on anonymous questions
CREATE INDEX IF NOT EXISTS idx_questions_anonymous ON questions (is_anonymous);
CREATE INDEX IF NOT EXISTS idx_questions_asker_name ON questions (asker_name) WHERE asker_name IS NOT NULL;

-- Update foreign key constraint to allow null author_id
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_author_id_fkey;
ALTER TABLE questions ADD CONSTRAINT questions_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;