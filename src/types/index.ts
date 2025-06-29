/**
 * Core type definitions for the AMA application
 * These types ensure type safety across the entire application
 */

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  reputation: number;
  created_at: string;
  is_moderator: boolean;
  bio?: string;
  location?: string;
  website?: string;
  questions_count: number;
  answers_count: number;
  accepted_answers_count: number;
  followers_count: number;
  following_count: number;
  notification_preferences: {
    email: boolean;
    push: boolean;
    new_answers: boolean;
    new_followers: boolean;
    mentions: boolean;
  };
}

export interface Question {
  id: string;
  title: string;
  content: string;
  content_type: 'plain' | 'rich';
  author_id: string | null; // null for anonymous questions
  author?: User;
  votes: number;
  answer_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_answered: boolean;
  is_featured: boolean;
  target_user_id?: string; // ID of the user the question is directed to
  target_user?: User; // User the question is directed to
  asker_name?: string | null; // Name for non-authenticated users
  is_anonymous?: boolean; // Whether the question is anonymous
}

export interface Answer {
  id: string;
  question_id: string;
  content: string;
  author_id: string;
  author?: User;
  votes: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
  comment_count?: number;
}

export interface Comment {
  id: string;
  answer_id: string;
  content: string;
  author_id: string;
  author?: User;
  votes: number;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  user_id: string;
  target_id: string; // question_id, answer_id, or comment_id
  target_type: 'question' | 'answer' | 'comment';
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_answer' | 'new_comment' | 'question_answered' | 'follow' | 'mention' | 'announcement';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  follower?: User;
  following?: User;
  created_at: string;
}

export interface TagSubscription {
  id: string;
  user_id: string;
  tag: string;
  created_at: string;
}

export interface QuestionShare {
  id: string;
  question_id: string;
  share_code: string;
  allow_anonymous: boolean;
  require_auth: boolean;
  created_by: string;
  created_at: string;
  question?: Question;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AppSettings {
  offlineMode: boolean;
  theme: 'dark' | 'light';
  notifications: boolean;
}

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  minVotes?: number;
  maxVotes?: number;
  minAnswers?: number;
  maxAnswers?: number;
  isAnswered?: boolean;
  authors?: string[];
  tags?: string[];
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}