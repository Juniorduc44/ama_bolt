/**
 * Authentication modal component
 * Handles user login and registration with email/password as default for signup and expandable auth options
 */

import React, { useState } from 'react';
import { X, Globe, Mail, Lock, User, Zap, ArrowRight, ChevronDown } from 'lucide-react';
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
  const [authMethod, setAuthMethod] = useState<'magic' | 'email' | 'github'>(
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

  const { signIn, signUp, signInWithMagicLink, auth } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation (required for all methods)
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Skip other validations for magic link method
    if (authMethod === 'magic') {
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
    try {
      if (authMethod === 'magic') {
        await signInWithMagicLink(formData.email);
        setMagicLinkSent(true);
      } else if (authMethod === 'email') {
        if (mode === 'signin') {
          await signIn(formData.email, formData.password);
          handleSuccess();
        } else {
          await signUp(formData.email, formData.password, formData.username);
          handleSuccess();
        }
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

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    // Set default auth method based on mode
    setAuthMethod(newMode === 'signup' ? 'email' : 'magic');
    setErrors({});
    setMagicLinkSent(false);
  };

  const handleAuthMethodChange = (method: 'magic' | 'email' | 'github') => {
    setAuthMethod(method);
    setShowAuthDropdown(false);
    setErrors({});
    setMagicLinkSent(false);
  };

  const getAuthMethodLabel = () => {
    switch (authMethod) {
      case 'magic':
        return 'Magic Link';
      case 'email':
        return 'Email & Password';
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
      case 'github':
        return <Globe className="h-4 w-4" />;
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
                <button
                  onClick={() => handleAuthMethodChange('github')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors duration-200 rounded-b-lg ${
                    authMethod === 'github' ? 'bg-slate-700' : ''
                  }`}
                  disabled
                >
                  <Globe className="h-4 w-4 text-slate-500" />
                  <div>
                    <div className="text-slate-500 font-medium">GitHub (Coming Soon)</div>
                    <div className="text-slate-500 text-sm">Sign in with GitHub</div>
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