import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EEEBD9',
        secondary: '#282427',
        'accent-orange': '#EE7B30',
        'accent-teal': '#2292A4',
        border: '#E5E7EB',
        input: '#D1D5DB',
        ring: '#2292A4',
        background: '#FFFFFF',
        foreground: '#282427',
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#16A34A',
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        heading: ['Lora', 'serif'],
        lora: ['Lora', 'serif'],
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        base: ['16px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        card: '16px',
        lg: '16px',
        md: '12px',
        sm: '10px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
