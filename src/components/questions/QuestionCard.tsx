/**
 * Question card component
 * Displays individual questions with voting, answers, and interaction controls
 */

import React from 'react';
import { ChevronUp, ChevronDown, MessageCircle, Clock, User, Star } from 'lucide-react';
import { Question } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface QuestionCardProps {
  question: Question;
  onVote: (questionId: string, voteType: 'up' | 'down') => void;
  onAnswerClick: (questionId: string) => void;
  currentUserId?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onVote,
  onAnswerClick,
  currentUserId
}) => {
  const handleVote = (voteType: 'up' | 'down') => {
    if (!currentUserId) {
      // TODO: Show login modal
      console.log('Please log in to vote');
      return;
    }
    onVote(question.id, voteType);
  };

  const timeAgo = formatDistanceToNow(new Date(question.created_at), { addSuffix: true });

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
            <h3 className="text-xl font-semibold text-white leading-tight pr-4">
              {question.title}
              {question.is_featured && (
                <Star className="inline-block h-5 w-5 text-yellow-400 ml-2" />
              )}
            </h3>
            
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
              {/* Author */}
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-slate-300">
                  {question.author?.username || 'Anonymous'}
                </span>
                {question.author?.is_moderator && (
                  <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                    MOD
                  </span>
                )}
              </div>

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