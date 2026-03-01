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
        background: "#f8f9fa",
        surface: "#ffffff",
        "surface-elevated": "#ffffff",
        "ollin-teal": "#008080",
        accent: "#008080",
        "accent-light": "#26a6a6",
        "accent-emerald": "#008080",
        "accent-hover": "#006666",
        "accent-muted": "rgba(0, 128, 128, 0.15)",
        "accent-muted-soft": "rgba(0, 128, 128, 0.08)",
        border: "#e5e5e5",
        "border-light": "#d4d4d4",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        "heading": "0.05em",
        "wide-soft": "0.03em",
      },
      borderRadius: {
        none: "0",
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
        full: "9999px",
        card: "12px",
        button: "12px",
        input: "12px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0, 0, 0, 0.04)",
        "soft-md": "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)",
        glow: "0 0 24px rgba(6, 182, 212, 0.2)",
        "glow-subtle": "0 0 20px rgba(6, 182, 212, 0.15)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #006666 0%, #008080 50%, #26a6a6 100%)",
        "gradient-primary-hover": "linear-gradient(135deg, #005555 0%, #006666 50%, #008080 100%)",
      },
      accentColor: {
        accent: "#008080",
      },
    },
  },
  plugins: [],
};

export default config;
