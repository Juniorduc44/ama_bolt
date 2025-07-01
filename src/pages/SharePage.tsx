/**
 * Share page component for QR code access
 * Allows users to view and respond to shared questions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Globe, User, Lock, MessageCircle } from 'lucide-react';
import { Question, QuestionShare } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase, isOfflineMode } from '../lib/supabase';
import { RichTextEditor } from '../components/ui/RichTextEditor';

export const SharePage: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  
  const [questionShare, setQuestionShare] = useState<QuestionShare | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Response form state
  const [responseContent, setResponseContent] = useState('');
  const [responseContentType, setResponseContentType] = useState<'plain' | 'rich'>('plain');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseSubmitted, setResponseSubmitted] = useState(false);

  useEffect(() => {
    if (shareCode) {
      loadSharedQuestion();
    }
  }, [shareCode]);

  const loadSharedQuestion = async () => {
    if (!shareCode) return;
    
    try {
      setLoading(true);
      setError(null);

      if (isOfflineMode()) {
        // Offline mode - simplified implementation
        setError('Shared questions are not available in offline mode');
        return;
      }

      // Load question share data
      const { data: shareData, error: shareError } = await supabase
        .from('question_shares')
        .select(`
          *,
          question:questions(
            *,
            author:profiles(*)
          )
        `)
        .eq('share_code', shareCode)
        .single();

      if (shareError) {
        if (shareError.code === 'PGRST116') {
          setError('This shared question link is invalid or has expired.');
        } else {
          throw shareError;
        }
        return;
      }

      if (!shareData) {
        setError('Shared question not found');
        return;
      }

      setQuestionShare(shareData);
      setQuestion(shareData.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!question || !responseContent.trim()) return;
    
    // Check authentication requirements
    if (questionShare?.require_auth && !auth.user) {
      setError('You must be signed in to respond to this question');
      return;
    }

    if (!questionShare?.allow_anonymous && !auth.user) {
      setError('Anonymous responses are not allowed for this question');
      return;
    }

    setSubmittingResponse(true);
    try {
      const answerData = {
        question_id: question.id,
        content: responseContent.trim(),
        author_id: auth.user?.id || null,
        votes: 0,
        is_accepted: false
      };

      const { error } = await supabase
        .from('answers')
        .insert([answerData]);

      if (error) throw error;

      setResponseSubmitted(true);
      setResponseContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Question</h2>
          <p className="text-slate-400">Please wait while we load the shared question...</p>
          <div className="mt-6">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !question || !questionShare) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Question Not Found</h2>
          <p className="text-slate-400 mb-6">
            {error || 'The shared question you\'re looking for doesn\'t exist or is no longer available.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to AMA Global
          </button>
        </div>
      </div>
    );
  }

  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Response Submitted!</h2>
          <p className="text-slate-400 mb-6">
            Thank you for your response. The question author will be notified.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/question/${question.id}`)}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              View Full Question
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Explore AMA Global
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Globe className="h-8 w-8 text-emerald-400" />
              <span className="text-xl font-bold text-white">
                AMA <span className="text-emerald-400">Global</span>
              </span>
            </div>
            
            {!auth.user && (
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition-colors duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Shared Question Info */}
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-emerald-400">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Shared Question</span>
            </div>
            <p className="text-slate-300 text-sm mt-1">
              You've been invited to answer this question. 
              {questionShare.allow_anonymous ? ' You can respond anonymously or' : ' You must'} 
              {questionShare.require_auth ? ' sign in to respond.' : ' respond without signing in.'}
            </p>
          </div>

          {/* Question */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold text-white leading-tight mb-4">
              {question.title}
            </h1>

            {question.content && (
              <div className="prose prose-invert max-w-none mb-6">
                {question.content_type === 'rich' ? (
                  <div dangerouslySetInnerHTML={{ __html: question.content }} />
                ) : (
                  <p className="text-slate-300 leading-relaxed">{question.content}</p>
                )}
              </div>
            )}

            {/* Tags */}
            {question.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {question.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Question Author */}
            <div className="flex items-center space-x-3 text-sm text-slate-400 border-t border-slate-700 pt-4">
              {question.author ? (
                <>
                  <div className="w-6 h-6 bg-emerald-600 rounded-full"></div>
                  <span className="font-medium text-slate-300">Asked by @{question.author.username}</span>
                  {question.author.is_moderator && (
                    <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                      MOD
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-slate-600 rounded-full"></div>
                  <span className="font-medium text-slate-400">Anonymous question</span>
                </>
              )}
            </div>
          </div>

          {/* Response Form */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Response</h2>

            {/* Authentication Check */}
            {questionShare.require_auth && !auth.user ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Sign In Required</h3>
                <p className="text-slate-400 mb-6">
                  You must be signed in to respond to this question.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Sign In to AMA Global
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Content Type Selection */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-slate-300">Response format:</span>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="contentType"
                      value="plain"
                      checked={responseContentType === 'plain'}
                      onChange={(e) => setResponseContentType(e.target.value as 'plain' | 'rich')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-300">Plain Text</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="contentType"
                      value="rich"
                      checked={responseContentType === 'rich'}
                      onChange={(e) => setResponseContentType(e.target.value as 'plain' | 'rich')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-300">Rich Text</span>
                  </label>
                </div>

                {/* Content Editor */}
                {responseContentType === 'rich' ? (
                  <RichTextEditor
                    value={responseContent}
                    onChange={setResponseContent}
                    placeholder="Write your response here..."
                  />
                ) : (
                  <textarea
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="Write your response here..."
                  />
                )}

                {/* User Info */}
                <div className="flex items-center space-x-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
                  {auth.user ? (
                    <>
                      <div className="w-8 h-8 bg-emerald-600 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          Responding as @{auth.user.username}
                        </div>
                        <div className="text-xs text-slate-400">
                          Your response will be public and linked to your account
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-400">
                          Responding anonymously
                        </div>
                        <div className="text-xs text-slate-500">
                          Your response will be public but not linked to any account
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResponse}
                    disabled={!responseContent.trim() || submittingResponse}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    {submittingResponse ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};