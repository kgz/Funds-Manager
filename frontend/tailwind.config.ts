import colors from 'tailwindcss/colors'
import type { Config } from 'tailwindcss'

module.exports = {
  theme: {
    colors: {
      ...colors,
	  primary: {
		default: 'var(--fg)',
	  },
	  secondary: {
		default: 'var(--accent)',
	  },
	  accent: {
		default: 'var(--accent)',
	  },
	  paper: {
		DEFAULT: 'var(--bg)',
		surface: 'var(--surface)',
		border: 'var(--border)',
		muted: 'var(--muted)',
		fg: 'var(--fg)',
	  },
    },
    fontFamily: {
      sans: ['var(--font-sans)'],
      mono: ['var(--font-mono)'],
    },
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
		paper: 'var(--radius)',
      }
    }
  },
  variants: {
    extend: {
      borderColor: ['focus-visible'],
      opacity: ['disabled'],
    }
  }
} as Config
