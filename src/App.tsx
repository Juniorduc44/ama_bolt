/**
 * Main application component
 * Orchestrates the entire AMA Global application with routing and state management
 */

import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { AuthModal } from './components/auth/AuthModal';
import { QuestionList } from './components/questions/QuestionList';
import { QuestionForm } from './components/questions/QuestionForm';
import { useAuthProvider } from './hooks/useAuth';
import { useQuestions } from './hooks/useQuestions';
import { isOfflineMode } from './lib/supabase';

/**
 * AppContent component that contains all context-dependent logic
 * This component is rendered within the AuthContext.Provider
 */
function AppContent() {
  // Questions state (now safely within AuthContext)
  const { questions, loading, createQuestion, voteOnQuestion } = useQuestions();
  
  // UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [offlineMode, setOfflineMode] = useState(isOfflineMode());

  // Access auth from context
  const { auth } = useAuthProvider();

  // Handle authentication requirement
  const requireAuth = (action: () => void) => {
    if (!auth.user) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  // Handle question creation
  const handleCreateQuestion = () => {
    requireAuth(() => setShowQuestionForm(true));
  };

  // Handle question form submission
  const handleQuestionSubmit = async (title: string, content: string, tags: string[]) => {
    try {
      await createQuestion(title, content, tags);
    } catch (error) {
      console.error('Failed to create question:', error);
      throw error;
    }
  };

  // Handle voting
  const handleVote = (questionId: string, voteType: 'up' | 'down') => {
    requireAuth(() => {
      voteOnQuestion(questionId, voteType).catch(error => {
        console.error('Failed to vote:', error);
      });
    });
  };

  // Handle answer click (placeholder for future implementation)
  const handleAnswerClick = (questionId: string) => {
    console.log('View answers for question:', questionId);
    // TODO: Navigate to question detail page
  };

  // Toggle offline mode
  const handleToggleOffline = () => {
    setOfflineMode(!offlineMode);
    // TODO: Implement actual offline mode switching
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <Header 
        onToggleOffline={handleToggleOffline}
        isOffline={offlineMode}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {!auth.user && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-slate-900/20 border border-emerald-600/20 rounded-xl p-6 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to AMA Global
              </h2>
              <p className="text-slate-300 mb-4">
                The universal platform for live Q&A sessions. Perfect for news channels, celebrities, influencers, and anyone wanting to engage with their audience through real-time questions.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Join the conversation
              </button>
            </div>
          </div>
        )}

        {/* Questions List */}
        <QuestionList
          questions={questions}
          loading={loading}
          onVote={handleVote}
          onAnswerClick={handleAnswerClick}
          onCreateQuestion={handleCreateQuestion}
          currentUserId={auth.user?.id}
        />
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <QuestionForm
        isOpen={showQuestionForm}
        onClose={() => setShowQuestionForm(false)}
        onSubmit={handleQuestionSubmit}
      />

      {/* Loading Overlay */}
      {auth.loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white">Loading...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // Authentication state (moved to top level, outside of context dependency)
  const { auth, signIn, signUp, signOut, AuthContext } = useAuthProvider();

  return (
    <AuthContext.Provider value={{ auth, signIn, signUp, signOut }}>
      <AppContent />
    </AuthContext.Provider>
  );
}

export default App;