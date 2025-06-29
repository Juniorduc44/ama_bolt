/**
 * Application header component
 * Provides navigation and user authentication controls
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, User, LogOut, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isOfflineMode } from '../../lib/supabase';

interface HeaderProps {
  onAuthClick: () => void;
  onToggleOffline?: () => void;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onAuthClick, onToggleOffline, isOffline = false }) => {
  const { auth, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
            >
              <Globe className="h-8 w-8 text-emerald-400" />
              <span className="text-xl font-bold text-white">
                AMA <span className="text-emerald-400">Global</span>
              </span>
            </button>
            
            {/* Offline Mode Indicator */}
            {(isOfflineMode() || isOffline) && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-yellow-900/30 border border-yellow-600/30 rounded-full">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-400 text-sm font-medium">Offline Mode</span>
              </div>
            )}
          </div>

          {/* Action Buttons and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Offline Mode Toggle */}
            {onToggleOffline && (
              <button
                onClick={onToggleOffline}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                  isOffline 
                    ? 'bg-yellow-900/30 border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/40' 
                    : 'bg-emerald-900/30 border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/40'
                }`}
                title={isOffline ? "Switch to Online Mode" : "Switch to Offline Mode"}
              >
                {isOffline ? (
                  <>
                    <WifiOff className="h-4 w-4" />
                    <span className="hidden sm:block text-sm font-medium">Offline</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4" />
                    <span className="hidden sm:block text-sm font-medium">Online</span>
                  </>
                )}
              </button>
            )}

            {auth.user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 text-white hover:text-emerald-400 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="hidden sm:block font-medium">{auth.user.username}</span>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm text-white font-medium">{auth.user.username}</p>
                      <p className="text-sm text-slate-400">{auth.user.email}</p>
                      <p className="text-xs text-emerald-400 mt-1">
                        Reputation: {auth.user.reputation}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigate(`/${auth.user!.username}`);
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200"
                    >
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </button>
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="text-slate-400 hover:text-white transition-colors duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};