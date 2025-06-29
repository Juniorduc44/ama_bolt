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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithGitHub: () => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get the correct redirect URL based on environment
const getRedirectUrl = (path: string = '/auth/callback') => {
  // Check if we're in development
  if (import.meta.env.DEV) {
    return `${window.location.origin}${path}`;
  }
  
  // For production, always use the deployed URL
  const deployedUrl = 'https://ama-global.netlify.app';
  return `${deployedUrl}${path}`;
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
            // Fetch or create profile
            let { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // If profile doesn't exist, create it (fallback for OAuth users)
            if (error && error.code === 'PGRST116') {
              const username = session.user.user_metadata?.username || 
                              session.user.user_metadata?.full_name?.replace(/\s+/g, '').toLowerCase() ||
                              session.user.email?.split('@')[0] || 
                              'user';
              
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    email: session.user.email!,
                    username: username,
                    reputation: 0,
                    is_moderator: false,
                    avatar_url: session.user.user_metadata?.avatar_url || null
                  }
                ])
                .select()
                .single();

              if (!insertError) {
                profile = newProfile;
              }
            }

            if (profile && mounted) {
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
        console.error('Auth initialization error:', error);
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
            try {
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
            } catch (error) {
              console.error('Profile fetch error:', error);
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
          return { error: null };
        } else {
          const error = new Error('Invalid credentials');
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
      } else {
        // Online mode: Supabase authentication
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
        
        setAuth(prev => ({ ...prev, loading: false }));
        return { error: null };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
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
        return { error: null };
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

        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
        
        setAuth(prev => ({ ...prev, loading: false }));
        return { error: null };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
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
        return { error: null };
      } else {
        // Online mode: Send magic link via Supabase with proper redirect URL
        const redirectTo = getRedirectUrl('/auth/callback');
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: {
              username: email.split('@')[0] // Use email prefix as default username
            },
            emailRedirectTo: redirectTo
          }
        });

        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }

        setAuth(prev => ({ ...prev, loading: false }));
        return { error: null };
      }
    } catch (error) {
      console.error('Magic link error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Magic link failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        const error = new Error('OAuth authentication is not available in offline mode');
        setAuth(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      const redirectTo = getRedirectUrl('/auth/callback');

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo
        }
      });

      if (error) {
        setAuth(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      // Don't set loading to false here - the redirect will handle the auth state
      return { error: null };
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      const errorMessage = error instanceof Error ? error.message : `${provider} sign in failed`;
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signInWithGoogle = async () => {
    return signInWithOAuth('google');
  };

  const signInWithGitHub = async () => {
    return signInWithOAuth('github');
  };

  const resetPassword = async (email: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: simulate password reset
        const error = new Error('Password reset not available in offline mode');
        setAuth(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      } else {
        // Online mode: Send password reset email with proper redirect URL
        const redirectTo = getRedirectUrl('/auth/reset-password');
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo
        });

        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
        
        setAuth(prev => ({ ...prev, loading: false }));
        return { error: null };
      }
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!auth.user) return { error: { message: 'Must be logged in to update profile' } };

    setAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: update localStorage
        const users = await offlineDB.getUsers();
        const updatedUsers = users.map(user => 
          user.id === auth.user!.id ? { ...user, ...updates } : user
        );
        localStorage.setItem('offline_users', JSON.stringify(updatedUsers));
        
        const updatedUser = { ...auth.user, ...updates };
        localStorage.setItem('offline_current_user', JSON.stringify(updatedUser));
        
        setAuth({
          user: updatedUser,
          loading: false,
          error: null
        });
        return { error: null };
      } else {
        // Online mode: update Supabase
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', auth.user.id)
          .select()
          .single();

        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }

        setAuth({
          user: data,
          loading: false,
          error: null
        });
        return { error: null };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    setAuth(prev => ({ ...prev, loading: true }));

    try {
      if (isOfflineMode()) {
        localStorage.removeItem('offline_current_user');
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) {
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
      }

      setAuth({
        user: null,
        loading: false,
        error: null
      });
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  return {
    auth,
    signIn,
    signUp,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithGitHub,
    signInWithOAuth,
    resetPassword,
    updateProfile,
    signOut,
    AuthContext
  };
};