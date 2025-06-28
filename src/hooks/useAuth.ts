/**
 * Authentication hook that handles both online and offline modes
 * Provides seamless user management across different environments with magic link support
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { User, AuthState } from '../types';

const AuthContext = createContext<{
  auth: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (isOfflineMode()) {
          // Offline mode: check localStorage for current user
          const currentUser = localStorage.getItem('offline_current_user');
          if (currentUser && mounted) {
            setAuth({
              user: JSON.parse(currentUser),
              loading: false,
              error: null
            });
          } else if (mounted) {
            setAuth(prev => ({ ...prev, loading: false }));
          }
        } else {
          // Online mode: check Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            // Fetch user profile from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setAuth({
                user: profile,
                loading: false,
                error: null
              });
            }
          } else if (mounted) {
            setAuth(prev => ({ ...prev, loading: false }));
          }
        }
      } catch (error) {
        if (mounted) {
          setAuth({
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error'
          });
        }
      }
    };

    initAuth();

    // Listen for auth changes in online mode
    if (!isOfflineMode()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            setAuth({ user: null, loading: false, error: null });
          } else if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile && mounted) {
              setAuth({
                user: profile,
                loading: false,
                error: null
              });
            }
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: simple credential check
        const users = await offlineDB.getUsers();
        const user = users.find(u => u.email === email);
        
        if (user) {
          localStorage.setItem('offline_current_user', JSON.stringify(user));
          setAuth({
            user,
            loading: false,
            error: null
          });
        } else {
          throw new Error('Invalid credentials');
        }
      } else {
        // Online mode: Supabase authentication
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: create user in localStorage
        const newUser = await offlineDB.saveUser({
          email,
          username,
          reputation: 0,
          created_at: new Date().toISOString(),
          is_moderator: false
        });

        localStorage.setItem('offline_current_user', JSON.stringify(newUser));
        setAuth({
          user: newUser,
          loading: false,
          error: null
        });
      } else {
        // Online mode: Supabase signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                email,
                username,
                reputation: 0,
                is_moderator: false
              }
            ]);

          if (profileError) throw profileError;
        }
      }
    } catch (error) {
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      }));
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: simulate magic link by creating/finding user
        const users = await offlineDB.getUsers();
        let user = users.find(u => u.email === email);
        
        if (!user) {
          // Create new user with email as username base
          const username = email.split('@')[0];
          user = await offlineDB.saveUser({
            email,
            username,
            reputation: 0,
            created_at: new Date().toISOString(),
            is_moderator: false
          });
        }

        // In offline mode, we'll simulate the magic link success immediately
        localStorage.setItem('offline_current_user', JSON.stringify(user));
        setAuth({
          user,
          loading: false,
          error: null
        });
      } else {
        // Online mode: Send magic link via Supabase
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: {
              username: email.split('@')[0] // Use email prefix as default username
            }
          }
        });

        if (error) throw error;

        // Don't set loading to false here - the magic link flow will handle auth state
        setAuth(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Magic link failed'
      }));
      throw error;
    }
  };

  const signOut = async () => {
    setAuth(prev => ({ ...prev, loading: true }));

    try {
      if (isOfflineMode()) {
        localStorage.removeItem('offline_current_user');
      } else {
        await supabase.auth.signOut();
      }

      setAuth({
        user: null,
        loading: false,
        error: null
      });
    } catch (error) {
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }));
    }
  };

  return {
    auth,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
    AuthContext
  };
};