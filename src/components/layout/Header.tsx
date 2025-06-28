/**
 * Application header component
 * Provides navigation, search, and user authentication controls
 */

import React, { useState } from 'react';
import { Globe, Search, User, LogOut, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isOfflineMode } from '../../lib/supabase';

interface HeaderProps {
  onToggleOffline?: () => void;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleOffline, isOffline = false }) => {
  const { auth, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchTerm);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Globe className="h-8 w-8 text-emerald-400" />
              <span className="text-xl font-bold text-white">
                AMA <span className="text-emerald-400">Global</span>
              </span>
            </div>
            
            {/* Offline Mode Indicator */}
            {(isOfflineMode() || isOffline) && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-yellow-900/30 border border-yellow-600/30 rounded-full">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-400 text-sm font-medium">Offline Mode</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <form onSubmit={handleSearch} className="relative">
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
            </form>
          </div>

          {/* User Menu */}
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
              <div className="flex items-center space-x-2">
                <button className="text-slate-400 hover:text-white transition-colors duration-200">
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};