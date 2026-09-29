export const THEME_STORAGE_KEY = "flowspace-theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage bisa diblokir (private mode dsb) - toggle tetap jalan untuk sesi ini.
  }
}
