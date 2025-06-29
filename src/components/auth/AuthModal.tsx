/**
 * Authentication modal component
 * Handles user login and registration with email/password as default for signup and expandable auth options
 */

import React, { useState } from 'react';
import { X, Globe, Mail, Lock, User, Zap, ArrowRight, ChevronDown, Github } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  // Default to email for signup, magic for signin
  const [authMethod, setAuthMethod] = useState<'magic' | 'email' | 'google' | 'github'>(
    initialMode === 'signup' ? 'email' : 'magic'
  );
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [success, setSuccess] = useState('');

  const { signIn, signUp, signInWithMagicLink, signInWithGoogle, signInWithGitHub } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation (required for all methods except OAuth)
    if (authMethod !== 'google' && authMethod !== 'github') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }

    // Skip other validations for magic link and OAuth methods
    if (authMethod === 'magic' || authMethod === 'google' || authMethod === 'github') {
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Password validation for email method
    if (authMethod === 'email') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      // Username validation (signup only)
      if (mode === 'signup') {
        if (!formData.username) {
          newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }

        // Confirm password validation
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccess('');

    try {
      let result;
      
      if (authMethod === 'magic') {
        result = await signInWithMagicLink(formData.email);
        if (!result.error) {
          setMagicLinkSent(true);
          setSuccess('Magic link sent! Check your email to sign in.');
        }
      } else if (authMethod === 'email') {
        if (mode === 'signin') {
          result = await signIn(formData.email, formData.password);
        } else {
          result = await signUp(formData.email, formData.password, formData.username);
        }
        
        if (!result.error) {
          handleSuccess();
        }
      } else if (authMethod === 'google') {
        result = await signInWithGoogle();
        // OAuth redirects, so we don't handle success here
      } else if (authMethod === 'github') {
        result = await signInWithGitHub();
        // OAuth redirects, so we don't handle success here
      }

      if (result?.error) {
        setErrors({ 
          submit: result.error.message || 'Authentication failed' 
        });
      }
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Authentication failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    setErrors({});
    
    try {
      let result;
      if (provider === 'google') {
        result = await signInWithGoogle();
      } else if (provider === 'github') {
        result = await signInWithGitHub();
      }

      if (result?.error) {
        setErrors({ 
          submit: result.error.message || 'Authentication failed' 
        });
      }
      // OAuth will redirect, so we don't handle success here
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Authentication failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Reset form and close modal on success
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
    setErrors({});
    setMagicLinkSent(false);
    setSuccess('');
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    // Set default auth method based on mode
    setAuthMethod(newMode === 'signup' ? 'email' : 'magic');
    setErrors({});
    setMagicLinkSent(false);
    setSuccess('');
  };

  const handleAuthMethodChange = (method: 'magic' | 'email' | 'google' | 'github') => {
    setAuthMethod(method);
    setShowAuthDropdown(false);
    setErrors({});
    setMagicLinkSent(false);
    setSuccess('');
  };

  const getAuthMethodLabel = () => {
    switch (authMethod) {
      case 'magic':
        return 'Magic Link';
      case 'email':
        return 'Email & Password';
      case 'google':
        return 'Google';
      case 'github':
        return 'GitHub';
      default:
        return 'Email & Password';
    }
  };

  const getAuthMethodIcon = () => {
    switch (authMethod) {
      case 'magic':
        return <Zap className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'google':
        return <Globe className="h-4 w-4" />;
      case 'github':
        return <Github className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  // Magic link success state
  if (magicLinkSent) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-slate-300 mb-6">
              We've sent a magic link to <span className="text-emerald-400 font-medium">{formData.email}</span>. 
              Click the link in your email to sign in instantly.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setMagicLinkSent(false)}
                className="w-full text-slate-400 hover:text-white transition-colors duration-200"
              >
                Try a different email
              </button>
              <button
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Globe className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Quick OAuth Buttons */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </button>
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">or continue with</span>
            </div>
          </div>
        </div>

        {/* Auth Method Selector */}
        <div className="px-6 pt-4">
          <div className="relative">
            <button
              onClick={() => setShowAuthDropdown(!showAuthDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors duration-200"
            >
              <div className="flex items-center space-x-2">
                {getAuthMethodIcon()}
                <span className="font-medium">{getAuthMethodLabel()}</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAuthDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Auth Method Dropdown */}
            {showAuthDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                <button
                  onClick={() => handleAuthMethodChange('email')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors duration-200 ${
                    authMethod === 'email' ? 'bg-slate-700' : ''
                  }`}
                >
                  <Mail className="h-4 w-4 text-blue-400" />
                  <div>
                    <div className="text-white font-medium">Email & Password</div>
                    <div className="text-slate-400 text-sm">Traditional login method</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAuthMethodChange('magic')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors duration-200 ${
                    authMethod === 'magic' ? 'bg-slate-700' : ''
                  }`}
                >
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-white font-medium">Magic Link</div>
                    <div className="text-slate-400 text-sm">Sign in with email link</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Magic Link Description */}
          {authMethod === 'magic' && (
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 text-emerald-400 mt-0.5" />
                <div>
                  <h3 className="text-emerald-400 font-medium text-sm">Instant Access</h3>
                  <p className="text-slate-300 text-sm mt-1">
                    Enter your email and we'll send you a secure link to sign in instantly. No password required!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Username field (signup with email only) */}
          {mode === 'signup' && authMethod === 'email' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.username ? 'border-red-500' : 'border-slate-700'
                  }`}
                  placeholder="Choose a username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username}</p>
              )}
            </div>
          )}

          {/* Email field (not for OAuth) */}
          {authMethod !== 'google' && authMethod !== 'github' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-slate-700'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>
          )}

          {/* Password fields (email method only) */}
          {authMethod === 'email' && (
            <>
              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Enter your password"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Confirm password field (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        errors.confirmPassword ? 'border-red-500' : 'border-slate-700'
                      }`}
                      placeholder="Confirm your password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-emerald-900/30 border border-emerald-600/30 rounded-lg">
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Submit button (only for non-OAuth methods) */}
          {authMethod !== 'google' && authMethod !== 'github' && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>
                    {authMethod === 'magic' ? 'Sending magic link...' :
                     mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>
                    {authMethod === 'magic' ? 'Send Magic Link' :
                     mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </span>
                  {authMethod === 'magic' && <ArrowRight className="h-4 w-4" />}
                </div>
              )}
            </button>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-slate-400 text-sm">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => handleModeChange(mode === 'signin' ? 'signup' : 'signin')}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};