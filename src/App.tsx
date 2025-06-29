/**
 * Main application component with routing
 * Orchestrates the entire AMA Global application with multi-page navigation
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { GlobalFeed } from './pages/GlobalFeed';
import { ProfilePage } from './pages/ProfilePage';
import { AskQuestionPage } from './pages/AskQuestionPage';
import { TagPage } from './pages/TagPage';
import { QuestionDetailPage } from './pages/QuestionDetailPage';
import { SharePage } from './pages/SharePage';
import { AuthCallback } from './pages/AuthCallback';
import { ResetPassword } from './pages/ResetPassword';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileSetupModal } from './components/auth/ProfileSetupModal';
import { ToastContainer } from './components/ui/Toast';
import { useAuthProvider } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { useState, useEffect } from 'react';

function AppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { auth } = useAuthProvider();
  const { toasts, removeToast } = useToast();

  // Check if user needs to complete profile setup (magic link users)
  useEffect(() => {
    if (auth.user && !auth.loading) {
      // Check if user has a default username (email prefix) and might want to customize it
      const emailPrefix = auth.user.email.split('@')[0];
      const hasDefaultUsername = auth.user.username === emailPrefix;
      
      // Show profile setup for new magic link users with default usernames
      // You can add additional logic here to track if user has seen this modal
      const hasSeenProfileSetup = localStorage.getItem(`profile_setup_${auth.user.id}`);
      
      if (hasDefaultUsername && !hasSeenProfileSetup) {
        setShowProfileSetup(true);
      }
    }
  }, [auth.user, auth.loading]);

  const handleProfileSetupComplete = () => {
    if (auth.user) {
      localStorage.setItem(`profile_setup_${auth.user.id}`, 'true');
    }
    setShowProfileSetup(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Routes>
        {/* Auth callback routes (no header) */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        
        {/* Share page (minimal header) */}
        <Route path="/share/:shareCode" element={<SharePage />} />
        
        {/* Main app routes (with header) */}
        <Route path="/*" element={
          <>
            <Header onAuthClick={() => setShowAuthModal(true)} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<GlobalFeed />} />
                <Route path="/ask" element={<AskQuestionPage />} />
                <Route path="/question/:questionId" element={<QuestionDetailPage />} />
                <Route path="/tag/:tagName" element={<TagPage />} />
                <Route path="/:username" element={<ProfilePage />} />
              </Routes>
            </main>
          </>
        } />
      </Routes>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        onComplete={handleProfileSetupComplete}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

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
  const { auth, signIn, signUp, signInWithMagicLink, resetPassword, updateProfile, signOut, AuthContext } = useAuthProvider();

  return (
    <AuthContext.Provider value={{ auth, signIn, signUp, signInWithMagicLink, resetPassword, updateProfile, signOut }}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;