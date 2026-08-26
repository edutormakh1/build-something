import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#07060b",
        gold: "#e8c96a",
        filament: "#f0d78c",
        moonlight: "#c5d4ea",
        moon: "#8ea0b8",
        vitrine: "#12101a",
      },
      fontFamily: {
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Didot", "Bodoni MT", "Georgia", "serif"],
        sans: ["Avenir Next", "Segoe UI", "Trebuchet MS", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
