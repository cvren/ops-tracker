import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6efe4",
        ink: "#11212d",
        mist: "#d8e2dc",
        signal: "#ef7d57",
        accent: "#2d6a6a",
        sun: "#f2c14e",
        line: "#d3c8b8"
      },
      boxShadow: {
        panel: "0 18px 60px -28px rgba(17, 33, 45, 0.35)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
