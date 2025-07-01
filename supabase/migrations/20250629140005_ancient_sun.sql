/*
  # Add OAuth Support for Google and GitHub

  1. Updates
    - Update profiles table to support OAuth user data
    - Add avatar_url support for OAuth providers
    - Update triggers to handle OAuth user creation

  2. Security
    - Maintain existing RLS policies
    - Ensure OAuth users get proper profile creation
*/

-- Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Update the handle_new_user function to support OAuth providers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    avatar_url,
    reputation,
    is_moderator,
    questions_count,
    answers_count,
    accepted_answers_count,
    followers_count,
    following_count,
    notification_preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    0,
    false,
    0,
    0,
    0,
    0,
    0,
    '{"email": true, "push": true, "new_answers": true, "new_followers": true, "mentions": true}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add index for avatar_url if needed
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;