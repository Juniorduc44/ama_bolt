/**
 * Supabase client configuration
 * Handles both online and offline modes for the AMA application
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client instance with proper configuration for network access
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure auth works across different domains/IPs
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Allow auth to work on different hosts
    flowType: 'pkce'
  },
  // Ensure requests work from any host
  global: {
    headers: {
      'X-Client-Info': 'ama-global-app'
    }
  }
});

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