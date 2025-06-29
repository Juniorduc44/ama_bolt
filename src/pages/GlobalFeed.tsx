/**
 * Global feed page component
 * Shows all questions from all users with search and filtering capabilities
 */

import React, { useState } from 'react';
import { Search, Filter, Users, Clock, TrendingUp, Zap } from 'lucide-react';
import { QuestionCard } from '../components/questions/QuestionCard';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';

type SortOption = 'newest' | 'oldest' | 'votes' | 'answers' | 'username-az' | 'username-za';

export const GlobalFeed: React.FC = () => {
  const { questions, loading, voteOnQuestion } = useQuestions();
  const { auth } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter questions based on search term
  const filteredQuestions = questions.filter(question => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search in title and content
    const titleMatch = question.title.toLowerCase().includes(searchLower);
    const contentMatch = question.content.toLowerCase().includes(searchLower);
    
    // Search in tags
    const tagMatch = question.tags.some(tag => tag.toLowerCase().includes(searchLower));
    
    // Search in author username - handle both direct username and @username format
    const authorUsername = question.author?.username || '';
    const usernameMatch = authorUsername.toLowerCase().includes(searchLower);
    
    // Also check for @username format in search
    const atUsernameMatch = searchLower.startsWith('@') 
      ? authorUsername.toLowerCase().includes(searchLower.slice(1))
      : false;
    
    // Check if the question is directed to a specific user (from title parsing)
    const targetUserMatch = question.title.match(/\(asked to @(\w+)\)$/);
    const targetUsername = targetUserMatch ? targetUserMatch[1].toLowerCase() : '';
    const targetMatch = targetUsername.includes(searchLower) || 
                       (searchLower.startsWith('@') && targetUsername.includes(searchLower.slice(1)));

    return titleMatch || contentMatch || tagMatch || usernameMatch || atUsernameMatch || targetMatch;
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
      case 'username-az':
        return (a.author?.username || '').localeCompare(b.author?.username || '');
      case 'username-za':
        return (b.author?.username || '').localeCompare(a.author?.username || '');
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
      case 'username-az':
      case 'username-za':
        return <Users className="h-4 w-4" />;
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-slate-900/20 border border-emerald-600/20 rounded-xl p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to AMA Global
          </h1>
          <p className="text-slate-300 mb-4">
            The universal platform for live Q&A sessions. Ask questions to anyone, anywhere. 
            Search through all questions or visit specific profiles to engage directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/ask"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Ask a Question
            </a>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Browse Questions
            </button>
          </div>
        </div>
      </div>

      {/* Header with Search and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">All Questions</h2>
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
              placeholder="Search questions, usernames, or @username..."
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
                { value: 'answers', label: 'Most Answers' },
                { value: 'username-az', label: 'Username A-Z' },
                { value: 'username-za', label: 'Username Z-A' }
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

      {/* Search Help Text */}
      {searchTerm && (
        <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-3">
          <p className="text-slate-400 text-sm">
            <span className="text-emerald-400 font-medium">Search tips:</span> 
            {' '}Try searching for usernames like "john" or "@john", question content, or tags. 
            Showing {filteredQuestions.length} result{filteredQuestions.length !== 1 ? 's' : ''} for "{searchTerm}".
          </p>
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
              : 'Be the first to ask a question on AMA Global.'
            }
          </p>
          {!searchTerm && (
            <a
              href="/ask"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <span>Ask a Question</span>
            </a>
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