/**
 * Question detail page component
 * Shows a single question with all its answers and allows interaction
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Flag, Edit, Trash2, Crown, MessageCircle, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';
import { Question, Answer, Comment } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { QRCodeGenerator } from '../components/ui/QRCodeGenerator';
import { formatDistanceToNow } from 'date-fns';

export const QuestionDetailPage: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Answer form state
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [answerContentType, setAnswerContentType] = useState<'plain' | 'rich'>('plain');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  // Comment states
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  
  // QR Code state
  const [showQRCode, setShowQRCode] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    allowAnonymous: true,
    requireAuth: false
  });

  useEffect(() => {
    if (questionId) {
      loadQuestionAndAnswers();
    }
  }, [questionId]);

  const loadQuestionAndAnswers = async () => {
    if (!questionId) return;
    
    try {
      setLoading(true);
      setError(null);

      if (isOfflineMode()) {
        // Offline mode implementation
        const questions = await offlineDB.getQuestions();
        const users = await offlineDB.getUsers();
        const answers = await offlineDB.getAnswers();
        
        const foundQuestion = questions.find(q => q.id === questionId);
        if (!foundQuestion) {
          setError('Question not found');
          return;
        }

        // Attach author info
        const questionWithAuthor = {
          ...foundQuestion,
          author: users.find(u => u.id === foundQuestion.author_id)
        };

        // Get answers for this question
        const questionAnswers = answers
          .filter(a => a.question_id === questionId)
          .map(answer => ({
            ...answer,
            author: users.find(u => u.id === answer.author_id)
          }));

        setQuestion(questionWithAuthor);
        setAnswers(questionAnswers);
      } else {
        // Online mode implementation
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select(`
            *,
            author:profiles(*)
          `)
          .eq('id', questionId)
          .single();

        if (questionError) throw questionError;
        if (!questionData) {
          setError('Question not found');
          return;
        }

        const { data: answersData, error: answersError } = await supabase
          .from('answers')
          .select(`
            *,
            author:profiles(*),
            comments:comments(
              *,
              author:profiles(*)
            )
          `)
          .eq('question_id', questionId)
          .order('is_accepted', { ascending: false })
          .order('votes', { ascending: false })
          .order('created_at', { ascending: true });

        if (answersError) throw answersError;

        setQuestion(questionData);
        setAnswers(answersData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!auth.user || !question || !answerContent.trim()) return;

    setSubmittingAnswer(true);
    try {
      const answerData = {
        question_id: question.id,
        content: answerContent.trim(),
        author_id: auth.user.id,
        votes: 0,
        is_accepted: false
      };

      if (isOfflineMode()) {
        const newAnswer = await offlineDB.saveAnswer(answerData);
        setAnswers(prev => [...prev, { ...newAnswer, author: auth.user }]);
      } else {
        const { data, error } = await supabase
          .from('answers')
          .insert([answerData])
          .select(`
            *,
            author:profiles(*)
          `)
          .single();

        if (error) throw error;
        setAnswers(prev => [...prev, data]);
      }

      setAnswerContent('');
      setShowAnswerForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!auth.user || !question) return;
    
    // Only question author or moderators can accept answers
    if (question.author_id !== auth.user.id && !auth.user.is_moderator) return;

    try {
      if (isOfflineMode()) {
        // Offline implementation would go here
      } else {
        const { error } = await supabase
          .from('answers')
          .update({ is_accepted: true })
          .eq('id', answerId);

        if (error) throw error;

        // Update local state
        setAnswers(prev => prev.map(answer => ({
          ...answer,
          is_accepted: answer.id === answerId
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept answer');
    }
  };

  const handleVoteAnswer = async (answerId: string, voteType: 'up' | 'down') => {
    if (!auth.user) return;

    try {
      // Implementation would depend on your voting system
      // For now, just update local state
      setAnswers(prev => prev.map(answer => {
        if (answer.id === answerId) {
          const increment = voteType === 'up' ? 1 : -1;
          return { ...answer, votes: answer.votes + increment };
        }
        return answer;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handleSubmitComment = async (answerId: string) => {
    if (!auth.user || !commentContent[answerId]?.trim()) return;

    setSubmittingComment(prev => ({ ...prev, [answerId]: true }));
    try {
      const commentData = {
        answer_id: answerId,
        content: commentContent[answerId].trim(),
        author_id: auth.user.id,
        votes: 0
      };

      if (isOfflineMode()) {
        // Offline implementation
      } else {
        const { data, error } = await supabase
          .from('comments')
          .insert([commentData])
          .select(`
            *,
            author:profiles(*)
          `)
          .single();

        if (error) throw error;

        // Update local state
        setAnswers(prev => prev.map(answer => {
          if (answer.id === answerId) {
            return {
              ...answer,
              comments: [...(answer.comments || []), data]
            };
          }
          return answer;
        }));
      }

      setCommentContent(prev => ({ ...prev, [answerId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [answerId]: false }));
    }
  };

  const generateShareCode = async () => {
    if (!question || !auth.user) return;

    try {
      const shareCode = `q_${question.id}_${Date.now()}`;
      
      if (!isOfflineMode()) {
        const { error } = await supabase
          .from('question_shares')
          .insert([{
            question_id: question.id,
            share_code: shareCode,
            allow_anonymous: shareSettings.allowAnonymous,
            require_auth: shareSettings.requireAuth,
            created_by: auth.user.id
          }]);

        if (error) throw error;
      }

      setShowQRCode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share code');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {error || 'Question not found'}
        </h3>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </button>
      </div>
    );
  }

  const canAcceptAnswers = auth.user && (question.author_id === auth.user.id || auth.user.is_moderator);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={generateShareCode}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
          
          {auth.user?.is_moderator && (
            <button className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200">
              <Flag className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-white leading-tight flex-1 pr-4">
            {question.title}
          </h1>
          
          {question.is_answered && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-emerald-900/30 border border-emerald-600/30 rounded-full text-emerald-400 text-sm font-medium">
              <Crown className="h-4 w-4" />
              <span>Answered</span>
            </div>
          )}
        </div>

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

        {/* Question Meta */}
        <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-700 pt-4">
          <div className="flex items-center space-x-4">
            {question.author && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-emerald-600 rounded-full"></div>
                <span className="font-medium text-slate-300">@{question.author.username}</span>
                {question.author.is_moderator && (
                  <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                    MOD
                  </span>
                )}
              </div>
            )}
            <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>{question.votes} votes</span>
            <span>{answers.length} answers</span>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">Share Question</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <QRCodeGenerator
                questionId={question.id}
                shareCode={`q_${question.id}_${Date.now()}`}
                allowAnonymous={shareSettings.allowAnonymous}
                requireAuth={shareSettings.requireAuth}
                onSettingsChange={setShareSettings}
              />
            </div>
          </div>
        </div>
      )}

      {/* Answer Form */}
      {auth.user && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          {!showAnswerForm ? (
            <button
              onClick={() => setShowAnswerForm(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Write an Answer</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Your Answer</h3>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="contentType"
                      value="plain"
                      checked={answerContentType === 'plain'}
                      onChange={(e) => setAnswerContentType(e.target.value as 'plain' | 'rich')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-300">Plain Text</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="contentType"
                      value="rich"
                      checked={answerContentType === 'rich'}
                      onChange={(e) => setAnswerContentType(e.target.value as 'plain' | 'rich')}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-300">Rich Text</span>
                  </label>
                </div>
              </div>

              {answerContentType === 'rich' ? (
                <RichTextEditor
                  value={answerContent}
                  onChange={setAnswerContent}
                  placeholder="Write your answer here..."
                />
              ) : (
                <textarea
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Write your answer here..."
                />
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAnswerForm(false);
                    setAnswerContent('');
                  }}
                  className="px-6 py-3 text-slate-400 hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answerContent.trim() || submittingAnswer}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Answers */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>
        </div>

        {answers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No answers yet</h3>
            <p className="text-slate-400">Be the first to answer this question!</p>
          </div>
        ) : (
          answers.map((answer) => (
            <div
              key={answer.id}
              className={`bg-slate-900/50 border rounded-xl p-6 ${
                answer.is_accepted ? 'border-emerald-600/50 bg-emerald-900/10' : 'border-slate-700'
              }`}
            >
              {/* Answer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {answer.author && (
                    <>
                      <div className="w-8 h-8 bg-emerald-600 rounded-full"></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">@{answer.author.username}</span>
                          {answer.author.is_moderator && (
                            <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                              MOD
                            </span>
                          )}
                          {answer.is_accepted && (
                            <span className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-600/30 text-emerald-400 text-xs rounded-full flex items-center space-x-1">
                              <Crown className="h-3 w-3" />
                              <span>Accepted</span>
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-400">
                          {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {canAcceptAnswers && !answer.is_accepted && (
                    <button
                      onClick={() => handleAcceptAnswer(answer.id)}
                      className="flex items-center space-x-1 px-3 py-1 text-emerald-400 hover:bg-emerald-900/20 border border-emerald-600/30 rounded-lg transition-colors duration-200"
                    >
                      <Crown className="h-4 w-4" />
                      <span className="text-sm">Accept</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Answer Content */}
              <div className="prose prose-invert max-w-none mb-4">
                <div dangerouslySetInnerHTML={{ __html: answer.content }} />
              </div>

              {/* Answer Actions */}
              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVoteAnswer(answer.id, 'up')}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-slate-400">{answer.votes}</span>
                    <button
                      onClick={() => handleVoteAnswer(answer.id, 'down')}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors duration-200"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [answer.id]: !prev[answer.id] }))}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {answer.comments?.length || 0} comments
                    </span>
                  </button>
                </div>
              </div>

              {/* Comments */}
              {showComments[answer.id] && (
                <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">
                  {answer.comments?.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-6 h-6 bg-slate-600 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            @{comment.author?.username}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Comment Form */}
                  {auth.user && (
                    <div className="flex space-x-3">
                      <div className="w-6 h-6 bg-emerald-600 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={commentContent[answer.id] || ''}
                          onChange={(e) => setCommentContent(prev => ({ ...prev, [answer.id]: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
                          placeholder="Add a comment..."
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmitComment(answer.id)}
                            disabled={!commentContent[answer.id]?.trim() || submittingComment[answer.id]}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 text-sm"
                          >
                            {submittingComment[answer.id] ? 'Posting...' : 'Post Comment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};