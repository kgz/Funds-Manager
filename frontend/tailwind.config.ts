// Example `tailwind.config.js` file
import colors from 'tailwindcss/colors'
import type { Config } from 'tailwindcss'

module.exports = {
  theme: {
    colors: {
      ...colors,
	  primary: {
		default: '#020403',
	  },
	  secondary: {
		default: '#a287cd',
	  },
	  accent: {
		default: '#fbbf24',
	  }
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
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