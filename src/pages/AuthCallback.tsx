/**
 * Auth callback page for handling magic link redirects
 * Processes authentication tokens and redirects users appropriately
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Globe } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/?error=auth_failed');
          }, 3000);
          return;
        }

        if (data.session) {
          // User is authenticated, redirect to home
          setStatus('success');
          setMessage('Sign in successful! Redirecting...');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          // No session found, redirect to home
          setStatus('error');
          setMessage('No authentication session found.');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred.');
        setTimeout(() => {
          navigate('/?error=auth_failed');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          status === 'loading' ? 'bg-emerald-600 animate-pulse' :
          status === 'success' ? 'bg-emerald-600' :
          'bg-red-600'
        }`}>
          <Globe className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {status === 'loading' ? 'Completing Sign In' :
           status === 'success' ? 'Sign In Successful' :
           'Sign In Failed'}
        </h2>
        <p className="text-slate-400 mb-6">
          {message}
        </p>
        {status === 'loading' && (
          <div className="mt-6">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
};