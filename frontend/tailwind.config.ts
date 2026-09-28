import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        odoo: {
          // Values live in src/index.css so the theme can switch at runtime.
          primary: "rgb(var(--odoo-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--odoo-primary-hover) / <alpha-value>)",
          secondary: "rgb(var(--odoo-secondary) / <alpha-value>)",
          dark: "#1B1D21",
          "dark-light": "#2C2C33",
          bg: "rgb(var(--odoo-bg) / <alpha-value>)",
          surface: "rgb(var(--odoo-surface) / <alpha-value>)",
          "surface-hover": "rgb(var(--odoo-surface-hover) / <alpha-value>)",
          "surface-sunken": "rgb(var(--odoo-surface-sunken) / <alpha-value>)",
          "column-head": "rgb(var(--odoo-column-head) / <alpha-value>)",
          track: "rgb(var(--odoo-track) / <alpha-value>)",
          border: "rgb(var(--odoo-border) / <alpha-value>)",
          "border-light": "rgb(var(--odoo-border-light) / <alpha-value>)",
          text: "rgb(var(--odoo-text) / <alpha-value>)",
          "text-soft": "rgb(var(--odoo-text-soft) / <alpha-value>)",
          "text-muted": "rgb(var(--odoo-text-muted) / <alpha-value>)",
          "text-light": "rgb(var(--odoo-text-light) / <alpha-value>)",
          success: "rgb(var(--odoo-success) / <alpha-value>)",
          warning: "rgb(var(--odoo-warning) / <alpha-value>)",
          danger: "rgb(var(--odoo-danger) / <alpha-value>)",
          info: "rgb(var(--odoo-info) / <alpha-value>)",
          "title-band": "rgb(var(--odoo-title-band) / <alpha-value>)",
          statusbar: "rgb(var(--odoo-statusbar) / <alpha-value>)",
          "statusbar-text": "rgb(var(--odoo-statusbar-text) / <alpha-value>)",
          drop: "rgb(var(--odoo-drop) / <alpha-value>)",
          "accent-soft": "rgb(var(--odoo-accent-soft) / <alpha-value>)",
          "accent-line": "rgb(var(--odoo-accent-line) / <alpha-value>)",
          "search-divider": "rgb(var(--odoo-search-divider) / <alpha-value>)",
          "search-icon": "rgb(var(--odoo-search-icon) / <alpha-value>)",
          "search-placeholder": "rgb(var(--odoo-search-placeholder) / <alpha-value>)",
          "search-action": "rgb(var(--odoo-search-action) / <alpha-value>)",
          "search-action-hover": "rgb(var(--odoo-search-action-hover) / <alpha-value>)",
          chip: "rgb(var(--odoo-chip) / <alpha-value>)",
          "chip-text": "rgb(var(--odoo-chip-text) / <alpha-value>)",
          avatar: "rgb(var(--odoo-avatar) / <alpha-value>)",
          link: "rgb(var(--odoo-link) / <alpha-value>)",
          action: "rgb(var(--odoo-action) / <alpha-value>)",
          // Tag colours stay fixed: the reference dark mode does not repaint them.
          tag: {
            blue: { bg: "#D4E6F9", text: "#1A5276" },
            green: { bg: "#D5F5E3", text: "#1E8449" },
            red: { bg: "#FADBD8", text: "#922B21" },
            yellow: { bg: "#FCF3CF", text: "#7D6608" },
            purple: { bg: "#E8DAEF", text: "#6C3483" },
            orange: { bg: "#FDEBD0", text: "#935116" },
          },
        },
        // Fallback border colour applied to every element in index.css.
        border: "hsl(var(--border))",
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
