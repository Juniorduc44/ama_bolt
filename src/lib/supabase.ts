/**
 * Supabase client configuration
 * Handles both online and offline modes for the AMA application
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

// Get the correct redirect URL based on environment
const getRedirectUrl = () => {
  // In production (Netlify), use the deployed URL
  if (import.meta.env.PROD) {
    return 'https://ama-global.netlify.app';
  }
  
  // In development, use localhost
  return 'http://localhost:5173';
};

// Create Supabase client instance with proper configuration for network access
export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Ensure auth works across different domains/IPs
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use PKCE flow for better security and compatibility
        flowType: 'pkce'
      },
      // Ensure requests work from any host
      global: {
        headers: {
          'X-Client-Info': 'ama-global-app'
        }
      }
    })
  : null;

/**
 * Check if the application is running in offline mode
 * This allows for private network events without internet connectivity
 */
export const isOfflineMode = (): boolean => {
  // Check localStorage for user preference first
  const savedOfflineMode = localStorage.getItem('ama_offline_mode');
  if (savedOfflineMode !== null) {
    return JSON.parse(savedOfflineMode);
  }
  
  // Fall back to environment variable or credential check
  return import.meta.env.VITE_OFFLINE_MODE === 'true' || !hasValidCredentials;
};

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return hasValidCredentials;
};

/**
 * Get a safe Supabase client that returns null when not configured
 * This prevents network requests when running in offline mode
 */
export const getSupabaseClient = () => {
  if (!hasValidCredentials) {
    console.warn('Supabase not configured - running in offline mode');
    return null;
  }
  return supabase;
};

/**
 * Safe wrapper for Supabase operations that handles offline mode
 */
export const safeSupabaseOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> => {
  if (!hasValidCredentials || isOfflineMode()) {
    console.warn('Supabase not available - using fallback data');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return fallback;
  }
};

/**
 * Get the correct redirect URL for auth callbacks
 */
export const getAuthRedirectUrl = (path: string = '/auth/callback') => {
  return `${getRedirectUrl()}${path}`;
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