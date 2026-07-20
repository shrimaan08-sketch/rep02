/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Ink navy — the "control panel" surface for nav/header, echoes a
        // factory-floor HMI rather than generic dashboard grey.
        ink: {
          950: "#0B1520",
          900: "#0F1F30",
          800: "#16293D",
          700: "#1F3A54",
          600: "#2B4E6E",
        },
        // Blueprint — primary accent, drawn from technical-drawing cyanotype blue.
        blueprint: {
          50: "#EAF4F8",
          100: "#CFE7F0",
          300: "#7FBCD4",
          500: "#1D7A9C",
          600: "#146485",
          700: "#0F4E68",
        },
        // Signal colors — modeled on indicator lamps (amber/green/red) used
        // on manufacturing equipment status panels.
        signal: {
          amber: "#C97A0C",
          "amber-bg": "#FDF3E1",
          green: "#2E7D4F",
          "green-bg": "#E7F5EC",
          red: "#B3402A",
          "red-bg": "#FAEAE6",
          slate: "#5B6B7A",
          "slate-bg": "#EEF1F4",
        },
        canvas: "#F6F7F9",
        paper: "#FFFFFF",
        hairline: "#DDE3E9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 31, 48, 0.06), 0 1px 0 rgba(15, 31, 48, 0.04)",
      },
      borderRadius: {
        sm2: "4px",
      },
    },
  },
  plugins: [],
};
