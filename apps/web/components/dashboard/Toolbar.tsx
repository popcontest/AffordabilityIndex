'use client';

import { StatusChip } from './StatusChip';
import { useState } from 'react';

interface ToolbarProps {
  lastUpdated?: Date;
  currentUrl?: string;
}

/**
 * Toolbar with "Copy link", "Download" placeholder, and last-updated chip
 */
export function Toolbar({ lastUpdated, currentUrl }: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <StatusChip
          label={`Updated ${lastUpdated.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
          tone="info"
        />
      )}
      <button
        onClick={handleCopyLink}
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button disabled className="text-sm text-gray-400 cursor-not-allowed">
        Download
      </button>
    </div>
  );
}
