import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dfe9ff",
          200: "#c3d5ff",
          300: "#9bb6ff",
          400: "#6f8dff",
          500: "#4b64f5",
          600: "#3947d9",
          700: "#2f38ae",
          800: "#2b3389",
          900: "#28306e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
