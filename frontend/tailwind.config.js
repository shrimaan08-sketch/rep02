/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Revion core surfaces — deep cool graphite with a blue undertone.
        ink: {
          950: "#080B14", 900: "#0C1120", 850: "#111829", 800: "#161F35",
          750: "#1C2842", 700: "#24334F", 600: "#31445F", 500: "#48597A",
          400: "#6B7A98", 300: "#97A3BC", 200: "#C4CBDA", 100: "#E4E8F0",
        },
        // Revion signature accent — electric azure.
        azure: {
          50: "#ECFBFF", 100: "#D0F4FE", 200: "#A6E9FD", 300: "#6DD9FA",
          400: "#2EC0F0", 500: "#0BA5DC", 600: "#0587BC", 700: "#0A6B97",
          800: "#11577B", 900: "#134968",
        },
        gold: { 300: "#F2CE7B", 400: "#E9B84D", 500: "#D89B24" },
        signal: {
          amber: "#D08700", "amber-bg": "#FEF6E7", "amber-ring": "#F5D78B",
          green: "#12855A", "green-bg": "#E6F6EE", "green-ring": "#9CE0BF",
          red: "#C23A34", "red-bg": "#FCEBEA", "red-ring": "#F2B5B1",
          slate: "#556074", "slate-bg": "#EFF1F5", "slate-ring": "#CDD3DE",
        },
        canvas: "#F5F7FB", "canvas-alt": "#EEF1F7", paper: "#FFFFFF",
        hairline: "#E2E7F0", "hairline-strong": "#D2D9E6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: { "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }] },
      boxShadow: {
        panel: "0 1px 2px rgba(12,17,32,0.05), 0 1px 3px rgba(12,17,32,0.04)",
        "panel-lg": "0 4px 12px -2px rgba(12,17,32,0.08), 0 2px 6px -2px rgba(12,17,32,0.05)",
        float: "0 12px 32px -8px rgba(12,17,32,0.18), 0 4px 12px -4px rgba(12,17,32,0.10)",
        "glow-azure": "0 0 0 1px rgba(11,165,220,0.20), 0 8px 24px -6px rgba(11,165,220,0.30)",
      },
      borderRadius: { sm2: "5px", md2: "8px", xl2: "14px" },
      backgroundImage: {
        "grid-blueprint": "linear-gradient(rgba(109,217,250,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(109,217,250,0.06) 1px, transparent 1px)",
        "azure-sheen": "linear-gradient(135deg, #0BA5DC 0%, #0A6B97 100%)",
        "ink-depth": "radial-gradient(120% 120% at 100% 0%, #1C2842 0%, #0C1120 60%)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { "fade-up": "fade-up 0.4s ease-out both", shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [],
};
