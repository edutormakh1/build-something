import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4ead8",
        ink: "#1c140c",
        rust: "#b5431f",
        forest: "#243c33",
        brass: "#b0892e",
        rule: "#cbb79a",
      },
      fontFamily: {
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
        sans: ["Avenir Next", "Segoe UI", "Trebuchet MS", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
