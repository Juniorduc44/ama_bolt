/**
 * Authentication modal component
 * Handles user login and registration with form validation and magic link support
 */

import React, { useState } from 'react';
import { X, Terminal, Mail, Lock, User, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'magic';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>(initialMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { signIn, signUp, signInWithMagicLink, auth } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation (required for all modes)
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Skip other validations for magic link mode
    if (mode === 'magic') {
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Password validation
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'magic') {
        await signInWithMagicLink(formData.email);
        setMagicLinkSent(true);
      } else if (mode === 'signin') {
        await signIn(formData.email, formData.password);
        handleSuccess();
      } else {
        await signUp(formData.email, formData.password, formData.username);
        handleSuccess();
      }
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
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleModeChange = (newMode: 'signin' | 'signup' | 'magic') => {
    setMode(newMode);
    setErrors({});
    setMagicLinkSent(false);
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
            <Terminal className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">
              {mode === 'magic' ? 'Quick Sign In' : 
               mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Auth Mode Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => handleModeChange('magic')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                mode === 'magic' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Magic Link</span>
            </button>
            <button
              onClick={() => handleModeChange('signin')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                mode === 'signin' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                mode === 'signup' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Magic Link Description */}
          {mode === 'magic' && (
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

          {/* Username field (signup only) */}
          {mode === 'signup' && (
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

          {/* Email field */}
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

          {/* Password fields (not for magic link) */}
          {mode !== 'magic' && (
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

          {/* Submit error */}
          {errors.submit && (
            <div className="p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>
                  {mode === 'magic' ? 'Sending magic link...' :
                   mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>
                  {mode === 'magic' ? 'Send Magic Link' :
                   mode === 'signin' ? 'Sign In' : 'Create Account'}
                </span>
                {mode === 'magic' && <ArrowRight className="h-4 w-4" />}
              </div>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-slate-400 text-sm">
            {mode === 'magic' ? 'Prefer traditional login? Switch to ' :
             mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            {mode !== 'magic' && (
              <button
                onClick={() => handleModeChange('magic')}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
              >
                Magic Link
              </button>
            )}
            {mode === 'magic' && (
              <button
                onClick={() => handleModeChange('signin')}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
              >
                Sign In
              </button>
            )}
            {mode === 'signin' && (
              <>
                {' or '}
                <button
                  onClick={() => handleModeChange('signup')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
                >
                  Sign Up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                {' or '}
                <button
                  onClick={() => handleModeChange('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};