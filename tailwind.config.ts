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
          50: "#f2f1ff",
          100: "#e6e4ff",
          200: "#cdc9ff",
          300: "#aaa1ff",
          400: "#8b7bff",
          500: "#7159ff",
          600: "#5f3dff",
          700: "#4f2fe0",
          800: "#3f26b3",
          900: "#332190",
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
        soft: "0 1px 2px 0 rgb(15 15 25 / 0.04), 0 8px 24px -8px rgb(15 15 25 / 0.08)",
        glow: "0 0 0 1px rgb(113 89 255 / 0.15), 0 8px 30px -6px rgb(113 89 255 / 0.35)",
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
          "0%, 100%": { boxShadow: "0 0 0 1px rgb(113 89 255 / 0.15), 0 8px 30px -6px rgb(113 89 255 / 0.35)" },
          "50%": { boxShadow: "0 0 0 1px rgb(113 89 255 / 0.25), 0 8px 38px -4px rgb(113 89 255 / 0.55)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
