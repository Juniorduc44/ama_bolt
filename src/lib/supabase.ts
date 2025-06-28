/**
 * Supabase client configuration
 * Handles both online and offline modes for the AMA application
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if the application is running in offline mode
 * This allows for private network events without internet connectivity
 */
export const isOfflineMode = (): boolean => {
  return import.meta.env.VITE_OFFLINE_MODE === 'true' || !supabaseUrl;
};

/**
 * Database tables configuration
 * Used for both Supabase and local SQL operations
 */
export const TABLES = {
  USERS: 'users',
  QUESTIONS: 'questions',
  ANSWERS: 'answers',
  VOTES: 'votes',
  PROFILES: 'profiles'
} as const;