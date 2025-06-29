/**
 * Profile page component
 * Shows questions specific to a single user with profile information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Clock, TrendingUp, Zap, User, Star, MessageCircle } from 'lucide-react';
import { QuestionCard } from '../components/questions/QuestionCard';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';
import { User as UserType } from '../types';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';

type SortOption = 'newest' | 'oldest' | 'votes' | 'answers';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { questions, loading, voteOnQuestion } = useQuestions();
  const { auth } = useAuth();
  
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Load profile user
  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;
      
      setProfileLoading(true);
      try {
        if (isOfflineMode()) {
          const users = await offlineDB.getUsers();
          const user = users.find(u => u.username === username);
          setProfileUser(user || null);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
          
          setProfileUser(profile);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfileUser(null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  // Filter questions for this specific user - include both authored questions and questions asked TO this user
  const userQuestions = questions.filter(question => {
    // Questions authored by this user
    const isAuthor = question.author?.username === username;
    
    // Questions asked TO this user (check if title contains "asked to @username")
    const isTargetUser = question.title.includes(`(asked to @${username})`);
    
    return isAuthor || isTargetUser;
  });

  // Filter questions based on search term
  const filteredQuestions = userQuestions.filter(question => {
    const searchLower = searchTerm.toLowerCase();
    return (
      question.title.toLowerCase().includes(searchLower) ||
      question.content.toLowerCase().includes(searchLower) ||
      question.tags.some(tag => tag.toLowerCase().includes(searchLower))
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
    navigate(`/question/${questionId}`);
  };

  const handleAskQuestion = () => {
    navigate(`/ask?to=${username}`);
  };

  if (profileLoading) {
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

  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Profile not found</h3>
        <p className="text-slate-400 mb-6">
          The user @{username} doesn't exist or hasn't been found.
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

  // Separate questions into authored and received
  const authoredQuestions = userQuestions.filter(q => q.author?.username === username);
  const receivedQuestions = userQuestions.filter(q => q.title.includes(`(asked to @${username})`));

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-slate-900/20 border border-emerald-600/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">@{profileUser.username}</h1>
                {profileUser.is_moderator && (
                  <span className="px-2 py-1 bg-purple-900/30 border border-purple-600/30 text-purple-400 text-xs rounded-full">
                    MOD
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">{profileUser.reputation} reputation</span>
                </div>
                <div className="flex items-center space-x-1 text-slate-400">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">{authoredQuestions.length} questions asked</span>
                </div>
                <div className="flex items-center space-x-1 text-slate-400">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">{receivedQuestions.length} questions received</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleAskQuestion}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Ask @{profileUser.username}</span>
          </button>
        </div>
      </div>

      {/* Header with Search and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Questions</h2>
          <span className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-full">
            {userQuestions.length} total
          </span>
          <span className="px-3 py-1 bg-emerald-900/30 border border-emerald-600/30 text-emerald-400 text-sm rounded-full">
            {receivedQuestions.length} received
          </span>
          <span className="px-3 py-1 bg-blue-900/30 border border-blue-600/30 text-blue-400 text-sm rounded-full">
            {authoredQuestions.length} authored
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
      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedQuestions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'No questions found' : `No questions for @${profileUser.username} yet`}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms or clear the search to see all questions.'
              : `Be the first to ask @${profileUser.username} a question.`
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
          {sortedQuestions.map((question) => {
            const isReceivedQuestion = question.title.includes(`(asked to @${username})`);
            return (
              <div key={question.id} className="relative">
                {/* Question Type Indicator */}
                {isReceivedQuestion && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                      Asked to you
                    </span>
                  </div>
                )}
                <QuestionCard
                  question={question}
                  onVote={handleVote}
                  onAnswerClick={handleAnswerClick}
                  currentUserId={auth.user?.id}
                  showTargetUser={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};