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
import { AuthModal } from './components/auth/AuthModal';
import { useAuthProvider } from './hooks/useAuth';
import { useState } from 'react';

function AppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { auth } = useAuthProvider();

  return (
    <div className="min-h-screen bg-slate-950">
      <Header onAuthClick={() => setShowAuthModal(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<GlobalFeed />} />
          <Route path="/ask" element={<AskQuestionPage />} />
          <Route path="/:username" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
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
  const { auth, signIn, signUp, signOut, AuthContext } = useAuthProvider();

  return (
    <AuthContext.Provider value={{ auth, signIn, signUp, signOut }}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;