import type { Config } from "tailwindcss";

// Colours point at the design tokens in globals.css (from design/ff.css); .th-light / .th-dark switch them.
// Typography, buttons, cards, options etc. use the ff.css component classes; Tailwind is for layout.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["variant", "&:is(.th-dark *)"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--text)",
        muted: "var(--muted)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        green: { DEFAULT: "var(--green)", soft: "var(--green-soft)", text: "var(--green-text)", on: "var(--on-green)" },
        orange: { DEFAULT: "var(--orange)", soft: "var(--orange-soft)", text: "var(--orange-text)", on: "var(--on-orange)" },
        berry: { DEFAULT: "var(--berry)", soft: "var(--berry-soft)", text: "var(--berry-text)", on: "var(--on-berry)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
