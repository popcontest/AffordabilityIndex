/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ai: {
          bg: '#fafaf9',
          surface: '#ffffff',
          'surface-elevated': '#ffffff',
          border: '#e7e5e4',
          'border-muted': '#f5f5f4',
          text: '#0a0a0a',
          'text-secondary': '#262626',
          'text-muted': '#525252',
          'text-subtle': '#737373',
          warm: '#ea580c',
          'warm-hover': '#c2410c',
          'warm-light': '#fed7aa',
          'warm-subtle': '#ffedd5',
          primary: '#2563eb',
          'primary-hover': '#1d4ed8',
          'primary-light': '#dbeafe',
          'primary-contrast': '#ffffff',
          positive: '#16a34a',
          'positive-light': '#dcfce7',
          caution: '#ca8a04',
          'caution-light': '#fef9c3',
          negative: '#dc2626',
          'negative-light': '#fee2e2',
        },
      },
      borderRadius: {
        'sm': 'var(--ai-radius-sm)',
        'md': 'var(--ai-radius-md)',
        'card': 'var(--ai-radius-card)',
        'lg': 'var(--ai-radius-lg)',
      },
      boxShadow: {
        sm: 'var(--ai-shadow-sm)',
        card: 'var(--ai-shadow-card)',
        'card-hover': 'var(--ai-shadow-card-hover)',
        lg: 'var(--ai-shadow-lg)',
      },
    },
  },
  plugins: [],
}
