/**
 * Question card component
 * Displays individual questions with voting, answers, and interaction controls
 * Supports both authenticated and anonymous questions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, MessageCircle, Clock, User, Star, UserX } from 'lucide-react';
import { Question } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface QuestionCardProps {
  question: Question;
  onVote: (questionId: string, voteType: 'up' | 'down') => void;
  onAnswerClick: (questionId: string) => void;
  currentUserId?: string;
  showTargetUser?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onVote,
  onAnswerClick,
  currentUserId,
  showTargetUser = false
}) => {
  const navigate = useNavigate();

  const handleVote = (voteType: 'up' | 'down') => {
    if (!currentUserId) {
      // TODO: Show login modal
      console.log('Please log in to vote');
      return;
    }
    onVote(question.id, voteType);
  };

  const handleAuthorClick = () => {
    if (question.author?.username) {
      navigate(`/${question.author.username}`);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(question.created_at), { addSuffix: true });

  // Extract target username from title if it contains "(asked to @username)"
  const targetUserMatch = question.title.match(/\(asked to @(\w+)\)$/);
  const targetUsername = targetUserMatch ? targetUserMatch[1] : null;
  const cleanTitle = targetUserMatch ? question.title.replace(/\s*\(asked to @\w+\)$/, '') : question.title;

  // Determine display name for the asker
  const getAskerDisplay = () => {
    if (question.author) {
      // Authenticated user
      return {
        name: question.author.username,
        isAuthenticated: true,
        isModerator: question.author.is_moderator
      };
    } else if (question.is_anonymous) {
      // Anonymous question
      return {
        name: 'Anonymous',
        isAuthenticated: false,
        isModerator: false
      };
    } else if (question.asker_name) {
      // Non-authenticated user with name
      return {
        name: question.asker_name,
        isAuthenticated: false,
        isModerator: false
      };
    } else {
      // Fallback
      return {
        name: 'Anonymous',
        isAuthenticated: false,
        isModerator: false
      };
    }
  };

  const askerInfo = getAskerDisplay();

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 hover:border-slate-600 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="flex space-x-4">
        {/* Voting Section */}
        <div className="flex flex-col items-center space-y-2 min-w-0">
          <button
            onClick={() => handleVote('up')}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors duration-200"
            disabled={!currentUserId}
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${
              question.votes > 0 ? 'text-emerald-400' : 
              question.votes < 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {question.votes}
            </div>
            <div className="text-xs text-slate-500">votes</div>
          </div>
          
          <button
            onClick={() => handleVote('down')}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
            disabled={!currentUserId}
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          {/* Question Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-4">
              <h3 className="text-xl font-semibold text-white leading-tight">
                {cleanTitle}
                {question.is_featured && (
                  <Star className="inline-block h-5 w-5 text-yellow-400 ml-2" />
                )}
              </h3>
              
              {/* Target User Display */}
              {showTargetUser && targetUsername && (
                <div className="mt-2">
                  <button
                    onClick={() => navigate(`/${targetUsername}`)}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-900/30 border border-emerald-600/30 rounded-full text-emerald-400 text-sm font-medium hover:bg-emerald-900/40 transition-colors duration-200"
                  >
                    <span>asked to</span>
                    <User className="h-3 w-3" />
                    <span>@{targetUsername}</span>
                  </button>
                </div>
              )}
            </div>
            
            {question.is_answered && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-900/30 border border-emerald-600/30 rounded-full text-emerald-400 text-xs font-medium">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span>Answered</span>
              </div>
            )}
          </div>

          {/* Question Content */}
          <p className="text-slate-300 leading-relaxed mb-4 line-clamp-3">
            {question.content}
          </p>

          {/* Tags */}
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {question.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full hover:bg-slate-700 transition-colors duration-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Question Meta */}
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center space-x-4">
              {/* Asker */}
              {askerInfo.isAuthenticated ? (
                <button
                  onClick={handleAuthorClick}
                  className="flex items-center space-x-2 hover:text-emerald-400 transition-colors duration-200"
                >
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-slate-300">
                    @{askerInfo.name}
                  </span>
                  {askerInfo.isModerator && (
                    <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                      MOD
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                    {question.is_anonymous ? (
                      <UserX className="h-4 w-4 text-slate-400" />
                    ) : (
                      <User className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className="font-medium text-slate-400">
                    {askerInfo.name}
                  </span>
                  {!askerInfo.isAuthenticated && (
                    <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 text-slate-400 text-xs rounded-full">
                      {question.is_anonymous ? 'ANON' : 'GUEST'}
                    </span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Answer Count */}
            <button
              onClick={() => onAnswerClick(question.id)}
              className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              <span>
                {question.answer_count} {question.answer_count === 1 ? 'answer' : 'answers'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};