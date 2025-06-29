/**
 * QR Code modal component for generating shareable question links
 * Supports both general question asking and profile-specific questions
 */

import React, { useState, useEffect } from 'react';
import { X, QrCode, Search, User, Copy, Download, Share2, Settings } from 'lucide-react';
import QRCode from 'qrcode';
import { User as UserType } from '../../types';
import { supabase, isOfflineMode } from '../../lib/supabase';
import { offlineDB } from '../../lib/offlineDB';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserType | null; // If provided, QR code is for this specific user
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  targetUser
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // User search state (for general QR codes)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(targetUser || null);
  const [showUserSearch, setShowUserSearch] = useState(!targetUser);
  
  // QR Code settings
  const [qrSettings, setQrSettings] = useState({
    allowAnonymous: true,
    size: 256,
    includeUserSearch: !targetUser
  });

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, selectedUser, qrSettings]);

  useEffect(() => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      if (isOfflineMode()) {
        const users = await offlineDB.getUsers();
        const filtered = users.filter(user =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 10));
      } else {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${searchTerm}%`)
          .limit(10);
        
        setSearchResults(users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    try {
      let url = '';
      
      if (selectedUser) {
        // Profile-specific QR code
        url = `${window.location.origin}/ask?to=${selectedUser.username}`;
      } else if (qrSettings.includeUserSearch) {
        // General QR code with user search capability
        url = `${window.location.origin}/ask`;
      } else {
        // Simple ask page
        url = `${window.location.origin}/ask`;
      }

      setShareUrl(url);

      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: qrSettings.size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    const filename = selectedUser 
      ? `ask-${selectedUser.username}-qr.png`
      : 'ask-question-qr.png';
    
    link.download = filename;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const title = selectedUser 
          ? `Ask @${selectedUser.username} a question`
          : 'Ask a question on AMA Global';
        
        await navigator.share({
          title,
          text: 'Join the conversation on AMA Global',
          url: shareUrl
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    setSearchTerm('');
    setSearchResults([]);
    setShowUserSearch(false);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setShowUserSearch(true);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">
              {selectedUser ? `Ask @${selectedUser.username}` : 'Ask a Question'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* User Selection (only for general QR codes) */}
          {!targetUser && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Target User (Optional)
              </label>
              
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-emerald-400 font-medium">@{selectedUser.username}</div>
                      <div className="text-slate-400 text-sm">{selectedUser.reputation} reputation</div>
                    </div>
                  </div>
                  <button
                    onClick={handleClearUser}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : showUserSearch ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Search for a username..."
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors duration-200"
                        >
                          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-medium">@{user.username}</div>
                            <div className="text-slate-400 text-sm">{user.reputation} reputation</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowUserSearch(false)}
                    className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    Skip - Create general question QR code
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="w-full flex items-center justify-center space-x-2 p-3 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors duration-200"
                >
                  <Search className="h-4 w-4" />
                  <span>Search for a specific user</span>
                </button>
              )}
            </div>
          )}

          {/* QR Code Display */}
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-lg mb-4">
              {loading ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-slate-200 rounded flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-slate-400" />
                </div>
              )}
            </div>
            
            <div className="text-sm text-slate-400 mb-4">
              {selectedUser ? (
                <>Scan to ask <span className="text-emerald-400 font-medium">@{selectedUser.username}</span> a question</>
              ) : (
                'Scan to ask a question on AMA Global'
              )}
            </div>
          </div>

          {/* QR Code Settings */}
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">QR Code Settings</h4>
              <Settings className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Size</span>
                <select
                  value={qrSettings.size}
                  onChange={(e) => setQrSettings(prev => ({ ...prev, size: Number(e.target.value) }))}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value={128}>Small (128px)</option>
                  <option value={256}>Medium (256px)</option>
                  <option value={512}>Large (512px)</option>
                </select>
              </div>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Allow anonymous questions</span>
                <input
                  type="checkbox"
                  checked={qrSettings.allowAnonymous}
                  onChange={(e) => setQrSettings(prev => ({ ...prev, allowAnonymous: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Share URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Share URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            <button
              onClick={handleCopyUrl}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Copy className="h-4 w-4" />
              <span>Copy URL</span>
            </button>
            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Usage Instructions */}
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
            <h4 className="text-emerald-400 font-medium text-sm mb-2">How to use this QR code:</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Share the QR code or URL with your audience</li>
              <li>• People can scan it with their phone camera</li>
              <li>• They'll be taken directly to the question form</li>
              {selectedUser && <li>• Questions will be directed to @{selectedUser.username}</li>}
              {qrSettings.allowAnonymous && <li>• Anonymous questions are allowed</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};