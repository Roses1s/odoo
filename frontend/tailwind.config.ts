import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: "#714B67",
          "primary-hover": "#5B3A52",
          secondary: "#00A09D",
          dark: "#1B1D21",
          "dark-light": "#2C2C33",
          bg: "#F8F9FA",
          surface: "#FFFFFF",
          border: "#DEE2E6",
          "border-light": "#E9ECEF",
          text: "#212529",
          "text-muted": "#6C757D",
          "text-light": "#ADB5BD",
          success: "#28A745",
          warning: "#FFC107",
          danger: "#DC3545",
          info: "#17A2B8",
          tag: {
            blue: { bg: "#D4E6F9", text: "#1A5276" },
            green: { bg: "#D5F5E3", text: "#1E8449" },
            red: { bg: "#FADBD8", text: "#922B21" },
            yellow: { bg: "#FCF3CF", text: "#7D6608" },
            purple: { bg: "#E8DAEF", text: "#6C3483" },
            orange: { bg: "#FDEBD0", text: "#935116" },
          },
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
