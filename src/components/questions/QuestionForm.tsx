/**
 * Question creation form component
 * Allows users to submit new questions with title, content, and tags
 */

import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';

interface QuestionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, tags: string[]) => Promise<void>;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tagInput: ''
  });
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    // Content is now optional - no minimum requirement

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData.title.trim(), formData.content.trim(), tags);
      
      // Reset form on success
      setFormData({ title: '', content: '', tagInput: '' });
      setTags([]);
      setErrors({});
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Ask a Question</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Title Field */}
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

          {/* Content Field */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-2">
              Question Details (Optional)
            </label>
            <textarea
              id="content"
              rows={8}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`block w-full px-4 py-3 border rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${
                errors.content ? 'border-red-500' : 'border-slate-700'
              }`}
              placeholder="Provide additional details about your question if needed. This field is optional - you can leave it blank if your title says it all."
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
              onClick={onClose}
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