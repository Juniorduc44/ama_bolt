/*
  # Comprehensive AMA Global Schema Update

  1. New Tables
    - `answers` - Store answers to questions
    - `comments` - Store comments on answers
    - `notifications` - Store user notifications
    - `follows` - Store user following relationships
    - `tag_subscriptions` - Store user tag subscriptions
    - `question_shares` - Store QR code sharing data

  2. Enhanced Tables
    - Update `questions` table with additional fields
    - Update `profiles` table with enhanced statistics

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table

  4. Functions
    - Add trigger functions for notifications
    - Add functions for statistics updates
*/

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  votes integer DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_answer', 'new_comment', 'question_answered', 'follow', 'mention', 'announcement')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create tag subscriptions table
CREATE TABLE IF NOT EXISTS tag_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tag)
);

ALTER TABLE tag_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create question shares table for QR codes
CREATE TABLE IF NOT EXISTS question_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  share_code text UNIQUE NOT NULL,
  allow_anonymous boolean DEFAULT true,
  require_auth boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE question_shares ENABLE ROW LEVEL SECURITY;

-- Add new columns to existing tables
DO $$
BEGIN
  -- Add rich content support to questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE questions ADD COLUMN content_type text DEFAULT 'plain' CHECK (content_type IN ('plain', 'rich'));
  END IF;

  -- Add statistics columns to profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'questions_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN questions_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'answers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN answers_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'accepted_answers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN accepted_answers_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN followers_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN following_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences jsonb DEFAULT '{"email": true, "push": true, "new_answers": true, "new_followers": true, "mentions": true}';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_author_id ON answers(author_id);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_votes ON answers(votes DESC);

CREATE INDEX IF NOT EXISTS idx_comments_answer_id ON comments(answer_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_tag_subscriptions_user_id ON tag_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_subscriptions_tag ON tag_subscriptions(tag);

CREATE INDEX IF NOT EXISTS idx_question_shares_question_id ON question_shares(question_id);
CREATE INDEX IF NOT EXISTS idx_question_shares_share_code ON question_shares(share_code);

-- RLS Policies for answers
CREATE POLICY "Anyone can read answers"
  ON answers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create answers"
  ON answers
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own answers"
  ON answers
  FOR UPDATE
  TO public
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own answers"
  ON answers
  FOR DELETE
  TO public
  USING (auth.uid() = author_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON comments
  FOR UPDATE
  TO public
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON comments
  FOR DELETE
  TO public
  USING (auth.uid() = author_id);

-- RLS Policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Anyone can read follows"
  ON follows
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create follows"
  ON follows
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
  ON follows
  FOR DELETE
  TO public
  USING (auth.uid() = follower_id);

-- RLS Policies for tag subscriptions
CREATE POLICY "Users can read their own tag subscriptions"
  ON tag_subscriptions
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag subscriptions"
  ON tag_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag subscriptions"
  ON tag_subscriptions
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- RLS Policies for question shares
CREATE POLICY "Anyone can read question shares"
  ON question_shares
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Question authors can create shares"
  ON question_shares
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT author_id FROM questions WHERE id = question_id
    )
  );

CREATE POLICY "Share creators can update shares"
  ON question_shares
  FOR UPDATE
  TO public
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE questions 
    SET answer_count = answer_count + 1,
        updated_at = now()
    WHERE id = NEW.question_id;
    
    -- Update user stats
    UPDATE profiles 
    SET answers_count = answers_count + 1
    WHERE id = NEW.author_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE questions 
    SET answer_count = answer_count - 1,
        updated_at = now()
    WHERE id = OLD.question_id;
    
    -- Update user stats
    UPDATE profiles 
    SET answers_count = answers_count - 1
    WHERE id = OLD.author_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_accepted_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- If answer was accepted
    IF NEW.is_accepted = true AND OLD.is_accepted = false THEN
      UPDATE profiles 
      SET accepted_answers_count = accepted_answers_count + 1
      WHERE id = NEW.author_id;
      
      UPDATE questions 
      SET is_answered = true
      WHERE id = NEW.question_id;
    -- If answer was unaccepted
    ELSIF NEW.is_accepted = false AND OLD.is_accepted = true THEN
      UPDATE profiles 
      SET accepted_answers_count = accepted_answers_count - 1
      WHERE id = NEW.author_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    UPDATE profiles 
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET following_count = following_count - 1
    WHERE id = OLD.follower_id;
    
    UPDATE profiles 
    SET followers_count = followers_count - 1
    WHERE id = OLD.following_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET questions_count = questions_count + 1
    WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET questions_count = questions_count - 1
    WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_answer_count ON answers;
CREATE TRIGGER trigger_update_answer_count
  AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_answer_count();

DROP TRIGGER IF EXISTS trigger_update_accepted_answer_count ON answers;
CREATE TRIGGER trigger_update_accepted_answer_count
  AFTER UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_accepted_answer_count();

DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

DROP TRIGGER IF EXISTS trigger_update_question_count ON questions;
CREATE TRIGGER trigger_update_question_count
  AFTER INSERT OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_question_count();

DROP TRIGGER IF EXISTS update_answers_updated_at ON answers;
CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();