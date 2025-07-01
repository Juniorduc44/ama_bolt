/**
 * Authentication hook that handles both online and offline modes
 * Provides seamless user management across different environments with magic link support
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, isOfflineMode, getAuthRedirectUrl, safeSupabaseOperation } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { User, AuthState } from '../types';
import { useToast } from './useToast';

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

export const useAuthProvider = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    // Initialize with cached user data to prevent flicker
    const cachedUser = localStorage.getItem('ama_cached_user');
    return {
      user: cachedUser ? JSON.parse(cachedUser) : null,
      loading: true,
      error: null
    };
  });

  const { warning, error: showError } = useToast();

  // Cache user data to prevent flicker during navigation
  useEffect(() => {
    if (auth.user) {
      localStorage.setItem('ama_cached_user', JSON.stringify(auth.user));
    } else {
      localStorage.removeItem('ama_cached_user');
    }
  }, [auth.user]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initAuth = async () => {
      try {
        if (isOfflineMode()) {
          // Offline mode: check localStorage for current user
          const currentUser = localStorage.getItem('offline_current_user');
          if (currentUser && mounted) {
            const user = JSON.parse(currentUser);
            setAuth({
              user,
              loading: false,
              error: null
            });
          } else if (mounted) {
            setAuth(prev => ({ ...prev, loading: false }));
          }
        } else {
          // Online mode: use safe Supabase operation
          const result = await safeSupabaseOperation(async () => {
            const { data: { session } } = await supabase!.auth.getSession();
            if (session?.user) {
              // Fetch or create profile
              let { data: profile, error } = await supabase!
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
                
                const { data: newProfile, error: insertError } = await supabase!
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

              return profile;
            }
            return null;
          }, null);

          if (result && mounted) {
            setAuth({
              user: result,
              loading: false,
              error: null
            });
          } else if (mounted) {
            setAuth(prev => ({ ...prev, loading: false }));
          }

          // Set up auth state listener for online mode
          if (supabase && mounted) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_OUT' || !session) {
                  setAuth({ user: null, loading: false, error: null });
                } else if (session?.user) {
                  // Don't show loading for auth state changes to prevent flicker
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

            authSubscription = subscription;
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

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [warning, showError]);

  const signIn = async (email: string, password: string) => {
    // Don't show loading state immediately to prevent flicker
    setAuth(prev => ({ ...prev, error: null }));

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
        // Online mode: use safe Supabase operation
        const result = await safeSupabaseOperation(async () => {
          const { error } = await supabase!.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;
          return true;
        }, false);

        if (result) {
          // Auth state will be updated by the listener
          return { error: null };
        } else {
          // Fallback to offline mode
          warning(
            'Connection Issues',
            'Unable to connect to server. Trying offline authentication.'
          );
          
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
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setAuth(prev => ({ ...prev, error: null }));

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
        // Online mode: use safe Supabase operation
        const result = await safeSupabaseOperation(async () => {
          const { data, error } = await supabase!.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: username
              }
            }
          });

          if (error) throw error;
          return data;
        }, null);

        if (result) {
          // Auth state will be updated by the listener
          return { error: null };
        } else {
          // Fallback to offline mode
          warning(
            'Account Created Offline',
            'Your account has been created locally. It will sync when connection is restored.'
          );
          
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
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setAuth(prev => ({ ...prev, error: null }));

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
        // Online mode: use safe Supabase operation
        const result = await safeSupabaseOperation(async () => {
          const redirectTo = getAuthRedirectUrl('/auth/callback');
          
          const { error } = await supabase!.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true,
              data: {
                username: email.split('@')[0] // Use email prefix as default username
              },
              emailRedirectTo: redirectTo
            }
          });

          if (error) throw error;
          return true;
        }, false);

        if (result) {
          return { error: null };
        } else {
          // Fallback to offline mode
          warning(
            'Magic Link Unavailable',
            'Creating account offline instead. It will sync when connection is restored.'
          );
          
          const users = await offlineDB.getUsers();
          let user = users.find(u => u.email === email);
          
          if (!user) {
            const username = email.split('@')[0];
            user = await offlineDB.saveUser({
              email,
              username,
              reputation: 0,
              created_at: new Date().toISOString(),
              is_moderator: false
            });
          }

          localStorage.setItem('offline_current_user', JSON.stringify(user));
          setAuth({
            user,
            loading: false,
            error: null
          });
          return { error: null };
        }
      }
    } catch (error) {
      console.error('Magic link error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Magic link failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setAuth(prev => ({ ...prev, error: null }));

    try {
      if (isOfflineMode()) {
        const error = new Error('OAuth authentication is not available in offline mode');
        setAuth(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      const result = await safeSupabaseOperation(async () => {
        const redirectTo = getAuthRedirectUrl('/auth/callback');

        const { error } = await supabase!.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo
          }
        });

        if (error) throw error;
        return true;
      }, false);

      if (!result) {
        const error = new Error(`${provider} authentication is not available`);
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
    setAuth(prev => ({ ...prev, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: simulate password reset
        const error = new Error('Password reset not available in offline mode');
        setAuth(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      } else {
        // Online mode: use safe Supabase operation
        const result = await safeSupabaseOperation(async () => {
          const redirectTo = getAuthRedirectUrl('/auth/reset-password');
          
          const { error } = await supabase!.auth.resetPasswordForEmail(email, {
            redirectTo
          });

          if (error) throw error;
          return true;
        }, false);

        if (result) {
          return { error: null };
        } else {
          const error = new Error('Password reset not available');
          setAuth(prev => ({ ...prev, loading: false, error: error.message }));
          return { error };
        }
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

    // Don't show loading for profile updates to prevent flicker
    setAuth(prev => ({ ...prev, error: null }));

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
        // Online mode: use safe Supabase operation
        const result = await safeSupabaseOperation(async () => {
          const { data, error } = await supabase!
            .from('profiles')
            .update(updates)
            .eq('id', auth.user!.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }, null);

        if (result) {
          setAuth({
            user: result,
            loading: false,
            error: null
          });
          return { error: null };
        } else {
          // Fallback to offline mode
          warning(
            'Profile Updated Offline',
            'Your profile changes have been saved locally and will sync when connection is restored.'
          );
          
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
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setAuth(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    // Don't show loading for sign out to prevent flicker
    setAuth(prev => ({ ...prev, error: null }));

    try {
      if (isOfflineMode()) {
        localStorage.removeItem('offline_current_user');
      } else {
        const result = await safeSupabaseOperation(async () => {
          const { error } = await supabase!.auth.signOut();
          if (error) throw error;
          return true;
        }, true); // Always succeed for sign out

        if (!result) {
          // Even if Supabase fails, clear local state
          localStorage.removeItem('offline_current_user');
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
      // Always clear local state even if sign out fails
      localStorage.removeItem('offline_current_user');
      setAuth({
        user: null,
        loading: false,
        error: null
      });
      return { error: null };
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