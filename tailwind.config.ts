import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F4F6",
        surface: "#FFFFFF",
        line: "#E2E5EA",
        ink: "#0E1726",
        body: "#3D4757",
        muted: "#6B7385",
        navy: { DEFAULT: "#0B1A2E", 2: "#132640", 3: "#1E3350" },
        accent: { DEFAULT: "#1D5FAF", soft: "#EAF1FA", strong: "#154A8A" },
        signal: { DEFAULT: "#B45309", soft: "#FDF3E4" },
        good: { DEFAULT: "#127A4B", soft: "#E7F5EE" },
        bad: { DEFAULT: "#B42318", soft: "#FDECEA" },
        // Source-type palette: requirement / guidance / implementation / community
        st: {
          req: "#1D4E89",
          "req-soft": "#E8EFF8",
          guide: "#0F6B64",
          "guide-soft": "#E5F3F1",
          impl: "#5B4B8A",
          "impl-soft": "#EFECF7",
          comm: "#8A5A00",
          "comm-soft": "#FBF1DC",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      maxWidth: {
        shell: "88rem",
      },
    },
  },
  plugins: [],
};

export default config;
