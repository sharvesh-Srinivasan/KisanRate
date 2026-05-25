/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./client/src/**/*.{js,jsx,ts,tsx}", "./client/public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#3B6E2F",
        "primary-light": "#5A9248",
        "primary-pale": "#EBF5E7",
        accent: "#C17F3A",
        "accent-light": "#F5E6D0",
        soil: "#7C5C3A",
        cream: "#FDFAF5",
        "text-main": "#2C1F0E",
        "text-muted": "#7A6652",
        border: "#D4C4AE",
        success: "#2D6A2D",
        danger: "#8B2020"
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Playfair Display", "serif"]
      },
      boxShadow: {
        card: "0 2px 8px rgba(44,31,14,0.06)"
      }
    }
  },
  plugins: []
};
