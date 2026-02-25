import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        accent: "#0D9488",
        "accent-light": "#14B8A6",
        "accent-emerald": "#059669",
        "accent-hover": "#0F766E",
        "accent-muted": "#CCFBF1",
        "accent-muted-soft": "#F0FDFA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-roboto)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        "heading": "0.02em",
        "wide-soft": "0.03em",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.06)",
        "soft-md": "0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
        glow: "0 0 24px rgba(13, 148, 136, 0.2)",
        "glow-subtle": "0 0 20px rgba(13, 148, 136, 0.15)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #059669 0%, #0D9488 50%, #14B8A6 100%)",
        "gradient-primary-hover": "linear-gradient(135deg, #047857 0%, #0F766E 50%, #0D9488 100%)",
      },
      accentColor: {
        accent: "#0D9488",
      },
    },
  },
  plugins: [],
};

export default config;
