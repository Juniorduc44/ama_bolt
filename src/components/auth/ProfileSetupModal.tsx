/**
 * Profile setup modal for magic link users
 * Allows users to set their username after magic link authentication
 */

import React, { useState } from 'react';
import { X, User, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { auth, updateProfile } = useAuth();
  const [username, setUsername] = useState(auth.user?.username || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (value: string): boolean => {
    if (!value.trim()) {
      setError('Username is required');
      return false;
    }
    if (value.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setError('Username can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUsername(username)) return;

    setLoading(true);
    try {
      await updateProfile({ username: username.trim() });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen || !auth.user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Welcome to AMA Global!</h3>
            <p className="text-slate-300 text-sm">
              You've successfully signed in with your magic link. Let's set up your username to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Choose Your Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    error ? 'border-red-500' : 'border-slate-700'
                  }`}
                  placeholder="Enter your username"
                  maxLength={30}
                />
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-400">{error}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                This will be your public display name. You can change it later.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-3 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};