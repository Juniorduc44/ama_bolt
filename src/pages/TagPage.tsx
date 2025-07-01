/**
 * Tag page component
 * Shows all questions with a specific tag
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, TrendingUp, Zap, Tag, ArrowLeft, Plus } from 'lucide-react';
import { QuestionCard } from '../components/questions/QuestionCard';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';

type SortOption = 'newest' | 'oldest' | 'votes' | 'answers';

export const TagPage: React.FC = () => {
  const { tagName } = useParams<{ tagName: string }>();
  const navigate = useNavigate();
  const { questions, loading, voteOnQuestion } = useQuestions();
  const { auth } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter questions for this specific tag
  const tagQuestions = questions.filter(question => 
    question.tags.some(tag => tag.toLowerCase() === tagName?.toLowerCase())
  );

  // Filter questions based on search term within this tag
  const filteredQuestions = tagQuestions.filter(question => {
    const searchLower = searchTerm.toLowerCase();
    return (
      question.title.toLowerCase().includes(searchLower) ||
      question.content.toLowerCase().includes(searchLower) ||
      question.author?.username.toLowerCase().includes(searchLower)
    );
  });

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

  const handleVote = (questionId: string, voteType: 'up' | 'down') => {
    voteOnQuestion(questionId, voteType).catch(error => {
      console.error('Failed to vote:', error);
    });
  };

  const handleAnswerClick = (questionId: string) => {
    console.log('View answers for question:', questionId);
    // TODO: Navigate to question detail page
  };

  const handleAskQuestion = () => {
    navigate('/ask');
  };

  if (!tagName) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Tag className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Invalid tag</h3>
        <p className="text-slate-400 mb-6">
          The tag you're looking for doesn't exist or is invalid.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Back to Global Feed
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-slate-700 rounded w-1/3"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
            <Tag className="h-8 w-8 text-emerald-400" />
            <span>#{tagName}</span>
          </h1>
          <p className="text-slate-400 mt-1">
            {tagQuestions.length} question{tagQuestions.length !== 1 ? 's' : ''} tagged with #{tagName}
          </p>
        </div>
      </div>

      {/* Tag Header */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-slate-900/20 border border-emerald-600/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <Tag className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">#{tagName}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <span className="text-sm font-medium">{tagQuestions.length} questions</span>
                </div>
                <div className="flex items-center space-x-1 text-slate-400">
                  <span className="text-sm">
                    {tagQuestions.filter(q => q.is_answered).length} answered
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleAskQuestion}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Ask Question</span>
          </button>
        </div>
      </div>

      {/* Header with Search and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl font-bold text-white">Questions</h3>
          <span className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full">
            {filteredQuestions.length} {searchTerm ? 'filtered' : 'total'}
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
              placeholder="Search within this tag..."
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
          >
            <Filter className="h-5 w-5" />
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
            <Tag className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No questions found' : `No questions tagged with #${tagName} yet`}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms or clear the search to see all questions with this tag.'
              : `Be the first to ask a question with the #${tagName} tag.`
            }
          </p>
          {!searchTerm && (
            <button
              onClick={handleAskQuestion}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Ask the First Question</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onVote={handleVote}
              onAnswerClick={handleAnswerClick}
              currentUserId={auth.user?.id}
              showTargetUser={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};