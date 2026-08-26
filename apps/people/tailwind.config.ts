import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0b0907",
        ink: "#f3eadc",
        rust: "#d4784a",
        forest: "#7d9a86",
        brass: "#c4a574",
        rule: "#c4a574",
      },
      fontFamily: {
        serif: ["var(--font-display-loaded)", "Iowan Old Style", "Palatino", "Georgia", "serif"],
        sans: ["var(--font-sans-loaded)", "Avenir Next", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
