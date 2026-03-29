import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ProPost visual identity
        pp: {
          bg: '#0A0A14',
          surface: '#12121F',
          border: '#1E1E3A',
          gold: '#FFD700',
          accent: '#00F0FF',
          text: '#E2E8F0',
          muted: '#64748B',
          danger: '#EF4444',
          warning: '#F59E0B',
          // Platform colors
          x: '#1DA1F2',
          linkedin: '#0077B5',
          instagram: '#E1306C',
          facebook: '#1877F2',
          web: '#22C55E',
          // Crisis levels
          crisis1: '#FFA500',
          crisis2: '#FF4500',
          crisis3: '#FF0000',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
