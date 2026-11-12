import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ghost: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
        },
        pumpkin: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        bone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
        },
      },
      fontFamily: {
        spooky: ["Georgia", "serif"],
      },
      animation: {
        "fade-ghost": "fadeGhost 2s ease-in-out infinite alternate",
        "crossfade-in": "crossfadeIn 0.6s ease-in-out forwards",
      },
      keyframes: {
        fadeGhost: {
          "0%": { opacity: "0.6" },
          "100%": { opacity: "0.1" },
        },
        crossfadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
