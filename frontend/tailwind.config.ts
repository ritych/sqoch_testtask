import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        serif: ["Literata", "Georgia", "serif"],
      },
      colors: {
        paper: "#efeae2",
        sheet: "#f7f4ee",
        ink: "#211e1a",
        muted: "#5e584f",
        line: "#ddd6cb",
        pine: "#243f36",
        "pine-dark": "#1b312a",
        clay: "#8d3b2a",
        "clay-soft": "#f6e6e0",
        moss: "#1d6842",
        "moss-soft": "#e4f2ea",
        sand: "#f8efd8",
        "sand-ink": "#6a4812",
      },
    },
  },
  plugins: [],
};

export default config;
