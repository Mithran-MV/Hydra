import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060a",
          900: "#0a0c14",
          800: "#12141e",
          700: "#1c1f2d",
          600: "#2a2e40",
        },
        venom: {
          50: "#effef7",
          100: "#d8ffee",
          200: "#b4ffdd",
          300: "#7affc2",
          400: "#37ff9e",
          500: "#00f57a",
          600: "#00cc63",
          700: "#009b50",
          800: "#047a41",
          900: "#076437",
          950: "#00391d",
        },
        blood: {
          500: "#ff2d55",
          600: "#e01a40",
          700: "#a10d28",
          800: "#6d0a1c",
        },
        ember: {
          400: "#ffb347",
          500: "#ff7f00",
        },
      },
      fontFamily: {
        display: ["'Cinzel'", "'Trajan Pro'", "serif"],
        mono: [
          "'JetBrains Mono'",
          "'IBM Plex Mono'",
          "ui-monospace",
          "monospace",
        ],
        sans: [
          "'Inter'",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "breathe": "breathe 6s ease-in-out infinite",
        "scan": "scan 4s linear infinite",
        "shimmer": "shimmer 3s linear infinite",
        "float": "float 8s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%,100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        scan: {
          "0%": { backgroundPosition: "0 -100%" },
          "100%": { backgroundPosition: "0 100%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(1.5deg)" },
        },
      },
      backgroundImage: {
        "grid-ink":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "noise":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        "venom-gradient":
          "radial-gradient(ellipse at top, rgba(0,245,122,0.25), transparent 60%), radial-gradient(ellipse at bottom, rgba(255,45,85,0.15), transparent 55%)",
      },
      dropShadow: {
        venom: ["0 0 18px rgba(0,245,122,0.55)", "0 0 40px rgba(0,245,122,0.3)"],
        blood: ["0 0 18px rgba(255,45,85,0.55)", "0 0 40px rgba(255,45,85,0.3)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
