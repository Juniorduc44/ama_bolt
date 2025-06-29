/*
  # Complete Authentication System Setup

  1. Database Functions
    - `handle_new_user()` - Automatically creates profiles for new users
    - `update_updated_at_column()` - Updates timestamp on record changes

  2. Triggers
    - Auto-create profile when user signs up
    - Auto-update timestamps on question updates

  3. Security
    - Enable RLS on all tables
    - Set up proper policies for profiles and questions
    - Ensure magic link users get profiles created automatically

  4. Indexes
    - Optimize queries for profiles and questions
*/

-- Function to handle new user signup (improved version)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
BEGIN
  -- Generate a default username from email or use provided username
  default_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is unique by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = default_username) LOOP
    default_username := default_username || '_' || floor(random() * 1000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, username, reputation, is_moderator, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    default_username,
    0,
    false,
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger to update questions timestamp
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can create questions" ON questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON questions;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Questions policies
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create questions"
  ON questions
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own questions"
  ON questions
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own questions"
  ON questions
  FOR DELETE
  USING (auth.uid() = author_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_unique ON profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_questions_author_created ON questions (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_votes_desc ON questions (votes DESC);

-- Ensure foreign key constraints exist
DO $$
BEGIN
  -- Check if foreign key constraint exists for questions.author_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_author_id_fkey' 
    AND table_name = 'questions'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT questions_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Check if foreign key constraint exists for profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;