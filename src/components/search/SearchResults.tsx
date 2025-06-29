/**
 * Search results component
 * Displays search results for both users and questions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageCircle, Star, Clock } from 'lucide-react';
import { Question, User as UserType } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  questions: Question[];
  users: UserType[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  onQuestionClick?: (question: Question) => void;
  onUserClick?: (user: UserType) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  questions,
  users,
  loading,
  error,
  searchTerm,
  onQuestionClick,
  onUserClick
}) => {
  const navigate = useNavigate();

  const handleUserClick = (user: UserType) => {
    if (onUserClick) {
      onUserClick(user);
    } else {
      navigate(`/${user.username}`);
    }
  };

  const handleQuestionClick = (question: Question) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    } else {
      // Navigate to the author's profile for now
      if (question.author) {
        navigate(`/${question.author.username}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white">Searching...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6">
        <p className="text-red-400">Search error: {error}</p>
      </div>
    );
  }

  if (!searchTerm) {
    return null;
  }

  const hasResults = users.length > 0 || questions.length > 0;

  if (!hasResults) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-white font-medium mb-2">No results found</h3>
        <p className="text-slate-400 text-sm">
          No users or questions found for "{searchTerm}". Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Section */}
      {users.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
            <User className="h-5 w-5 text-emerald-400" />
            <span>Users ({users.length})</span>
          </h3>
          <div className="grid gap-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="flex items-center space-x-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors duration-200 text-left w-full"
              >
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">@{user.username}</span>
                    {user.is_moderator && (
                      <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                        MOD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="flex items-center space-x-1 text-emerald-400 text-sm">
                      <Star className="h-3 w-3" />
                      <span>{user.reputation}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{user.email}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Questions Section */}
      {questions.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <span>Questions ({questions.length})</span>
          </h3>
          <div className="space-y-4">
            {questions.map((question) => (
              <button
                key={question.id}
                onClick={() => handleQuestionClick(question)}
                className="block w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium line-clamp-2 flex-1 pr-4">
                    {question.title}
                  </h4>
                  {question.is_answered && (
                    <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-600/30 text-emerald-400 text-xs rounded-full whitespace-nowrap">
                      Answered
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                  {question.content}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-3">
                    {question.author && (
                      <span className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>@{question.author.username}</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span>{question.votes} votes</span>
                    <span>{question.answer_count} answers</span>
                  </div>
                </div>
                {question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {question.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                    {question.tags.length > 3 && (
                      <span className="text-slate-500 text-xs">
                        +{question.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};