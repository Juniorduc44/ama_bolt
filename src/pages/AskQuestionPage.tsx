/**
 * Ask question page component
 * Allows anyone (authenticated or anonymous) to ask questions to specific users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Tag, Plus, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useQuestions } from '../hooks/useQuestions';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { User as UserType } from '../types';

export const AskQuestionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUsername = searchParams.get('to');
  
  const { auth } = useAuth();
  const { createQuestion } = useQuestions();
  
  const [targetUser, setTargetUser] = useState<UserType | null>(null);
  const [userSearch, setUserSearch] = useState(targetUsername || '');
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tagInput: '',
    askerName: '',
    isAnonymous: false
  });
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load available users for search
  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (isOfflineMode()) {
          const users = await offlineDB.getUsers();
          setAvailableUsers(users);
        } else {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .order('username');
          
          setAvailableUsers(profiles || []);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();
  }, []);

  // Load target user if specified
  useEffect(() => {
    const loadTargetUser = async () => {
      if (!targetUsername) return;
      
      try {
        if (isOfflineMode()) {
          const users = await offlineDB.getUsers();
          const user = users.find(u => u.username === targetUsername);
          setTargetUser(user || null);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', targetUsername)
            .single();
          
          setTargetUser(profile);
        }
      } catch (error) {
        console.error('Failed to load target user:', error);
      }
    };

    loadTargetUser();
  }, [targetUsername]);

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!targetUser) {
      newErrors.targetUser = 'Please select a user to ask';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length < 20) {
      newErrors.content = 'Content must be at least 20 characters';
    }

    // If not authenticated and not anonymous, require name
    if (!auth.user && !formData.isAnonymous && !formData.askerName.trim()) {
      newErrors.askerName = 'Please provide your name or choose to ask anonymously';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create question with target user information
      const questionTitle = `${formData.title} (asked to @${targetUser!.username})`;
      
      await createQuestion(questionTitle, formData.content, tags);
      
      // Navigate to the target user's profile
      navigate(`/${targetUser!.username}`);
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to create question' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleUserSelect = (user: UserType) => {
    setTargetUser(user);
    setUserSearch(user.username);
    setShowUserDropdown(false);
    if (errors.targetUser) {
      setErrors(prev => ({ ...prev, targetUser: '' }));
    }
  };

  const addTag = () => {
    const tag = formData.tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags(prev => [...prev, tag]);
      setFormData(prev => ({ ...prev, tagInput: '' }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Ask a Question</h1>
          <p className="text-slate-400 mt-1">
            Ask anyone on AMA Global - authentication optional
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target User Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Who do you want to ask? *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                  setTargetUser(null);
                }}
                onFocus={() => setShowUserDropdown(true)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.targetUser ? 'border-red-500' : 'border-slate-700'
                }`}
                placeholder="Search for a username..."
              />
              
              {/* User Dropdown */}
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredUsers.slice(0, 10).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">@{user.username}</div>
                        <div className="text-slate-400 text-sm">{user.reputation} reputation</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.targetUser && (
              <p className="mt-1 text-sm text-red-400">{errors.targetUser}</p>
            )}
            
            {/* Selected User Display */}
            {targetUser && (
              <div className="mt-3 flex items-center space-x-3 p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-emerald-400 font-medium">Asking @{targetUser.username}</div>
                  <div className="text-slate-400 text-sm">{targetUser.reputation} reputation</div>
                </div>
              </div>
            )}
          </div>

          {/* Asker Information (for non-authenticated users) */}
          {!auth.user && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Your Information</h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isAnonymous}
                    onChange={(e) => handleInputChange('isAnonymous', e.target.checked.toString())}
                    className="rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-300">Ask anonymously</span>
                </label>
              </div>
              
              {!formData.isAnonymous && (
                <div>
                  <label htmlFor="askerName" className="block text-sm font-medium text-slate-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="askerName"
                    value={formData.askerName}
                    onChange={(e) => handleInputChange('askerName', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      errors.askerName ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Enter your name"
                  />
                  {errors.askerName && (
                    <p className="mt-1 text-sm text-red-400">{errors.askerName}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Question Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Question Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`block w-full px-4 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-slate-700'
              }`}
              placeholder="What would you like to ask?"
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.title && (
                <p className="text-sm text-red-400">{errors.title}</p>
              )}
              <p className="text-xs text-slate-500 ml-auto">
                {formData.title.length}/200
              </p>
            </div>
          </div>

          {/* Question Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-2">
              Question Details *
            </label>
            <textarea
              id="content"
              rows={8}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`block w-full px-4 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${
                errors.content ? 'border-red-500' : 'border-slate-700'
              }`}
              placeholder="Provide detailed information about your question. Include relevant context and any specific details that would help provide a better answer..."
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="text-sm text-red-400">{errors.content}</p>
              )}
              <p className="text-xs text-slate-500 ml-auto">
                {formData.content.length}/2000
              </p>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (Optional)
            </label>
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={formData.tagInput}
                  onChange={(e) => handleInputChange('tagInput', e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Add tags (e.g., live, breaking-news, interview)"
                  maxLength={20}
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                disabled={!formData.tagInput.trim() || tags.length >= 5}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            {/* Tag Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-slate-400 hover:text-red-400 transition-colors duration-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-xs text-slate-500">
              Add up to 5 tags to help categorize your question ({tags.length}/5)
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-slate-400 hover:text-white transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Publishing...</span>
                </div>
              ) : (
                'Publish Question'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};