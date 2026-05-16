/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--bg-main)',
        secondary: 'var(--card-bg)',
        mainText: 'var(--text-main)',
        mutedText: 'var(--text-muted)',
        goldAccent: 'var(--accent)',
        // Smart Contrast Engine variables
        themeBg: 'var(--bg-primary)',
        themeText: 'var(--text-primary)',
        themeSecondary: 'var(--text-secondary)',
        themeMuted: 'var(--text-muted)',
      },
      transitionDuration: {
        'theme': '300ms',
      }
    },
  },
  plugins: [],
}
