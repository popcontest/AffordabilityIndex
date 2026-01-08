'use client';

import { useState } from 'react';

interface EmailSignupProps {
  variant?: 'inline' | 'modal';
  title?: string;
  description?: string;
  placeholder?: string;
}

/**
 * Email signup component for newsletter/updates
 * Can be used inline in pages or as a modal popup
 */
export function EmailSignup({
  variant = 'inline',
  title = 'Stay Updated on Affordability',
  description = 'Get monthly insights on the most affordable places to live, market trends, and new features.',
  placeholder = 'Enter your email',
}: EmailSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      // TODO: Replace with actual newsletter API endpoint
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus('success');
      setMessage('Thanks for subscribing! Check your email to confirm.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const formId = `email-signup-${variant}`;

  if (variant === 'modal') {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-8 text-white shadow-xl" role="region" aria-labelledby={`${formId}-title`}>
        <h3 id={`${formId}-title`} className="text-2xl font-bold mb-3">{title}</h3>
        <p className="text-blue-100 mb-6">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={`${formId}-description`}>
          <div className="flex gap-2">
            <label htmlFor={`${formId}-email`} className="sr-only">
              Email address
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              disabled={status === 'loading' || status === 'success'}
              aria-invalid={status === 'error'}
              aria-describedby={message ? `${formId}-message` : undefined}
            />
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              aria-label="Subscribe to newsletter"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>

          {message && (
            <p id={`${formId}-message`} className={`text-sm ${status === 'error' ? 'text-red-200' : 'text-white'}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
              {message}
            </p>
          )}
        </form>

        <p className="text-xs text-blue-200 mt-4">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6" role="region" aria-labelledby={`${formId}-title`}>
      <h3 id={`${formId}-title`} className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor={`${formId}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={status === 'loading' || status === 'success'}
            aria-invalid={status === 'error'}
            aria-describedby={message ? `${formId}-message` : undefined}
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Subscribe to newsletter"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {message && (
          <p id={`${formId}-message`} className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-green-600'}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
            {message}
          </p>
        )}
      </form>

      <p className="text-xs text-gray-500 mt-3">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
