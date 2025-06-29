/**
 * Question list component
 * Displays a list of questions with sorting and filtering options
 */

import React, { useState } from 'react';
import { Search, Filter, Plus, Zap, Clock, TrendingUp } from 'lucide-react';
import { Question } from '../../types';
import { QuestionCard } from './QuestionCard';

interface QuestionListProps {
  questions: Question[];
  loading: boolean;
  onVote: (questionId: string, voteType: 'up' | 'down') => void;
  onAnswerClick: (questionId: string) => void;
  onCreateQuestion: () => void;
  currentUserId?: string;
}

type SortOption = 'newest' | 'oldest' | 'votes' | 'answers';

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  loading,
  onVote,
  onAnswerClick,
  onCreateQuestion,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter questions based on search term
  const filteredQuestions = questions.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort questions based on selected option
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'votes':
        return b.votes - a.votes;
      case 'answers':
        return b.answer_count - a.answer_count;
      default:
        return 0;
    }
  });

  const getSortIcon = (option: SortOption) => {
    switch (option) {
      case 'newest':
      case 'oldest':
        return <Clock className="h-4 w-4" />;
      case 'votes':
        return <TrendingUp className="h-4 w-4" />;
      case 'answers':
        return <Zap className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 animate-pulse"
          >
            <div className="flex space-x-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 bg-slate-700 rounded"></div>
                <div className="w-8 h-6 bg-slate-700 rounded"></div>
                <div className="w-8 h-8 bg-slate-700 rounded"></div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                <div className="flex space-x-2">
                  <div className="h-6 w-16 bg-slate-700 rounded-full"></div>
                  <div className="h-6 w-20 bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">Questions</h1>
          <span className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full">
            {questions.length} questions
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Search questions..."
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Ask Question Button */}
          <button
            onClick={onCreateQuestion}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:block">Ask Question</span>
          </button>
        </div>
      </div>

      {/* Sort Options */}
      {showFilters && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-300">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'newest', label: 'Newest' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'votes', label: 'Most Votes' },
                { value: 'answers', label: 'Most Answers' }
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    sortBy === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {getSortIcon(option.value)}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {sortedQuestions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No questions found' : 'No questions yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms or clear the search to see all questions.'
              : 'Be the first to ask a technical question and get help from the community.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateQuestion}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Ask a Question</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onVote={onVote}
              onAnswerClick={onAnswerClick}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};