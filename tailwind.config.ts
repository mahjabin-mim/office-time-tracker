import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "hsl(var(--surface))",
        brand: {
          50: "#f4f2ff",
          100: "#ebe6ff",
          200: "#d8cfff",
          300: "#baa9ff",
          400: "#987aff",
          500: "#7c4dff",
          600: "#6a2ff5",
          700: "#5a20d6",
          800: "#4a1caf",
          900: "#3d1a8c",
        },
        extra: {
          DEFAULT: "hsl(var(--extra))",
          foreground: "hsl(var(--extra-foreground))",
        },
        less: {
          DEFAULT: "hsl(var(--less))",
          foreground: "hsl(var(--less-foreground))",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 15 35 / 0.04), 0 10px 30px -12px rgb(15 15 35 / 0.12)",
        glow: "0 0 0 1px rgb(106 47 245 / 0.14), 0 10px 30px -8px rgb(106 47 245 / 0.45)",
        lift: "0 1px 2px 0 rgb(15 15 35 / 0.05), 0 18px 40px -16px rgb(106 47 245 / 0.35)",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 1px rgb(106 47 245 / 0.15), 0 8px 30px -6px rgb(106 47 245 / 0.35)" },
          "50%": { boxShadow: "0 0 0 1px rgb(106 47 245 / 0.25), 0 8px 38px -4px rgb(106 47 245 / 0.55)" },
        },
        "ring-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgb(106 47 245 / 0.45)" },
          "70%, 100%": { boxShadow: "0 0 0 14px rgb(106 47 245 / 0)" },
        },
        wave: {
          "0%, 60%, 100%": { transform: "rotate(0deg)" },
          "10%, 30%": { transform: "rotate(14deg)" },
          "20%": { transform: "rotate(-8deg)" },
          "40%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(10deg)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(6%, 4%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-4%, 6%, 0) scale(0.95)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in-up": "fade-up 0.2s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "ring-pulse": "ring-pulse 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        wave: "wave 2.4s ease-in-out 0.6s 2",
        drift: "drift 24s ease-in-out infinite",
        "drift-slow": "drift 34s ease-in-out infinite reverse",
        "gradient-x": "gradient-x 6s ease infinite",
        "grow-x": "grow-x 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
