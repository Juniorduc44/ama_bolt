/**
 * Auth callback page for handling magic link redirects
 * Processes authentication tokens and redirects users appropriately
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/?error=auth_failed');
          return;
        }

        if (data.session) {
          // User is authenticated, redirect to home
          navigate('/', { replace: true });
        } else {
          // No session found, redirect to home
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Globe className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In</h2>
        <p className="text-slate-400">
          Please wait while we complete your authentication...
        </p>
        <div className="mt-6">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
};