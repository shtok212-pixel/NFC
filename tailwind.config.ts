import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // A warm copper, not stock Tailwind orange — reads as considered
        // rather than default, and pairs with the dark espresso ink below.
        brand: {
          50: "#fbf3ea",
          100: "#f3e1cb",
          200: "#e7c39c",
          300: "#dca773",
          400: "#d08f52",
          500: "#c8793b",
          600: "#b0662e",
          700: "#935424",
          800: "#78451e",
          900: "#5c3517",
        },
        ink: {
          900: "#1b1712",
          800: "#241e17",
          700: "#332a20",
        },
        sage: {
          500: "#7ca085",
          600: "#688d73",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.06)",
        float: "0 8px 24px rgba(0,0,0,0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.28)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        pulse2: "pulse2 1.6s ease-in-out infinite",
        "rise-in": "rise-in 0.45s cubic-bezier(0.22, 0.9, 0.24, 1) both",
        pop: "pop 0.3s cubic-bezier(0.3, 1.6, 0.4, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
