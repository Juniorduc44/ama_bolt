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
}

export interface Question {
  id: string;
  title: string;
  content: string;
  author_id: string;
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
}

export interface Answer {
  id: string;
  question_id: string;
  content: string;
  author_id: string;
  author?: User;
  votes: number;
  created_at: string;
  updated_at: string;
  is_accepted: boolean;
}

export interface Vote {
  id: string;
  user_id: string;
  target_id: string; // question_id or answer_id
  target_type: 'question' | 'answer';
  vote_type: 'up' | 'down';
  created_at: string;
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