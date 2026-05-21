import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0,0,0,.26)",
        soft: "0 18px 60px rgba(15, 23, 42, .12)"
      }
    }
  },
  plugins: []
};

export default config;
