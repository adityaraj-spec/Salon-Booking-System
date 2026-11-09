/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Neutrals (Warm luxury canvas)
        canvas: {
          DEFAULT: "#FBFBFA", // Warm off-white
          subtle: "#F5F3EF",
          muted: "#EFECE6",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#F7F6F3",
          hover: "#F9F8F5",
        },
        charcoal: {
          DEFAULT: "#1C1917", // Primary deep charcoal text
          secondary: "#44403C",
          muted: "#78716C",
          subtle: "#A8A29E",
        },
        border: {
          subtle: "#E7E5E4",
          muted: "#D6D3D1",
          active: "#A8A29E",
        },

        // Warm Bronze/Gold Brand Palette (Preserved)
        brand: {
          50: "#FDFBF4",
          100: "#FDF7E5",
          200: "#FBECBE",
          300: "#F6DC8D",
          400: "#E8C45A",
          500: "#D4AF37", // Signature primary warm gold
          600: "#B8962E", // Hover state
          700: "#947623", // Pressed/active
          800: "#755D20",
          900: "#604C1E",
          DEFAULT: "#D4AF37",
        },

        // Semantic Status Colors
        status: {
          available: {
            bg: "#ECFDF5",
            border: "#A7F3D0",
            text: "#047857",
            dot: "#10B981",
          },
          occupied: {
            bg: "#FFF1F2",
            border: "#FECDD3",
            text: "#BE123C",
            dot: "#F43F5E",
          },
          pending: {
            bg: "#FFFBEB",
            border: "#FDE68A",
            text: "#B45309",
            dot: "#F59E0B",
          },
        },
      },

      // Single Clean Sans-Serif Typography System
      fontFamily: {
        sans: ["'Inter'", "'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
        serif: ["'Inter'", "'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"], // Explicitly maps to clean sans
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },

      boxShadow: {
        "soft-xs": "0 1px 2px 0 rgba(28, 25, 23, 0.04)",
        "soft-sm": "0 2px 4px 0 rgba(28, 25, 23, 0.04), 0 1px 2px -1px rgba(28, 25, 23, 0.06)",
        "soft-md": "0 6px 16px -2px rgba(28, 25, 23, 0.06), 0 2px 6px -1px rgba(28, 25, 23, 0.04)",
        "soft-lg": "0 12px 28px -4px rgba(28, 25, 23, 0.08), 0 4px 10px -2px rgba(28, 25, 23, 0.04)",
        "soft-xl": "0 20px 40px -6px rgba(28, 25, 23, 0.10), 0 8px 16px -4px rgba(28, 25, 23, 0.05)",
        "glow-gold": "0 0 24px -4px rgba(212, 175, 55, 0.35)",
        "glow-emerald": "0 0 24px -4px rgba(16, 185, 129, 0.30)",
      },

      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
        pill: "9999px",
      },

      letterSpacing: {
        tighter: "-0.035em",
        tight: "-0.02em",
        pin: "0.35em", // Check-in 4-digit PIN verification tracking
      },

      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

