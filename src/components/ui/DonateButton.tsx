/**
 * Donate button component
 * Provides a subtle but accessible way for users to support the platform
 */

import React, { useState } from 'react';
import { Heart, X, ExternalLink } from 'lucide-react';

interface DonateButtonProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ 
  variant = 'floating',
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const donateUrl = 'https://pay.zaprite.com/pl_iT3k7W4JRo';

  const handleDonate = () => {
    window.open(donateUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleDonate}
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Heart className={`h-4 w-4 ${isHovered ? 'animate-pulse' : ''}`} />
        <span>Support AMA Global</span>
        <ExternalLink className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-16 right-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">Support AMA Global</h4>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            Help us keep AMA Global free and open for everyone. Your support helps us maintain servers, add new features, and grow the community.
          </p>
          <button
            onClick={handleDonate}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            <Heart className="h-4 w-4" />
            <span>Donate Now</span>
            <ExternalLink className="h-3 w-3" />
          </button>
          
          {/* Arrow pointing to button */}
          <div className="absolute bottom-0 right-6 transform translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700"></div>
          </div>
        </div>
      )}

      {/* Floating Donate Button */}
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-14 h-14 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center group"
          title="Support AMA Global"
        >
          <Heart className={`h-6 w-6 ${isHovered ? 'animate-pulse' : ''} transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`} />
          
          {/* Subtle pulse animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 animate-ping opacity-20"></div>
        </button>

        {/* Small indicator for new users */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-slate-900">!</span>
        </div>
      </div>
    </div>
  );
};