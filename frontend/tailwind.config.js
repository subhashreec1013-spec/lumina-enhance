/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Clash Display'", "'DM Sans'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        lumina: {
          50:  "#f0f4ff",
          100: "#dce6ff",
          200: "#b3caff",
          300: "#7aa5ff",
          400: "#3d78ff",
          500: "#0f52ff",
          600: "#0038db",
          700: "#002ab0",
          800: "#001e80",
          900: "#001460",
        },
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
        surface: {
          900: "#050508",
          800: "#0a0a10",
          700: "#111118",
          600: "#18181f",
          500: "#1e1e28",
          400: "#252530",
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-blue":  "radial-gradient(ellipse at 50% 0%, rgba(15,82,255,0.25) 0%, transparent 70%)",
        "glow-amber": "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.15) 0%, transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
