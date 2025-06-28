/*
  # Create questions table for Q&A platform

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required) 
      - `author_id` (uuid, foreign key to auth.users)
      - `votes` (integer, default 0)
      - `answer_count` (integer, default 0)
      - `created_at` (timestamp with timezone, default now())
      - `updated_at` (timestamp with timezone, default now())
      - `tags` (text array, for categorization)
      - `is_answered` (boolean, default false)
      - `is_featured` (boolean, default false)

  2. Security
    - Enable RLS on `questions` table
    - Add policy for authenticated users to read all questions
    - Add policy for authenticated users to create their own questions
    - Add policy for users to update their own questions
    - Add policy for users to delete their own questions

  3. Indexes
    - Add index on author_id for efficient user queries
    - Add index on created_at for sorting
    - Add index on tags for filtering
*/

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  votes integer DEFAULT 0,
  answer_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tags text[] DEFAULT '{}',
  is_answered boolean DEFAULT false,
  is_featured boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create questions"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own questions"
  ON questions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_author_id ON questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_votes ON questions(votes DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();