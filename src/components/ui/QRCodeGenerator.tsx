/**
 * QR Code generator component
 * Creates QR codes for question sharing
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Share2, Settings } from 'lucide-react';

interface QRCodeGeneratorProps {
  questionId: string;
  shareCode: string;
  allowAnonymous: boolean;
  requireAuth: boolean;
  onSettingsChange: (settings: { allowAnonymous: boolean; requireAuth: boolean }) => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  questionId,
  shareCode,
  allowAnonymous,
  requireAuth,
  onSettingsChange
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/share/${shareCode}`;

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = await QRCode.toDataURL(shareUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQRCode();
  }, [shareUrl]);

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
    link.download = `question-${questionId}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Answer this question',
          text: 'Someone wants your answer to this question',
          url: shareUrl
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Share Question</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">Sharing Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={allowAnonymous}
                onChange={(e) => onSettingsChange({ allowAnonymous: e.target.checked, requireAuth })}
                className="rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Allow anonymous responses</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => onSettingsChange({ allowAnonymous, requireAuth: e.target.checked })}
                className="rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Require authentication to respond</span>
            </label>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      <div className="text-center mb-6">
        {qrCodeUrl ? (
          <div className="inline-block p-4 bg-white rounded-lg">
            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
          </div>
        ) : (
          <div className="w-48 h-48 bg-slate-800 rounded-lg flex items-center justify-center mx-auto">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Share URL */}
      <div className="mb-4">
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
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
        <button
          onClick={handleCopyUrl}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <Copy className="h-4 w-4" />
          <span>Copy URL</span>
        </button>
        <button
          onClick={handleDownloadQR}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
      </div>

      {/* Settings Info */}
      <div className="mt-4 p-3 bg-slate-800/30 border border-slate-600/30 rounded-lg">
        <p className="text-xs text-slate-400">
          Current settings: {allowAnonymous ? 'Anonymous responses allowed' : 'No anonymous responses'}, 
          {requireAuth ? ' Authentication required' : ' No authentication required'}
        </p>
      </div>
    </div>
  );
};