export type Theme = "light" | "dark";

// Namespaced: in development every app on `localhost` shares one storage area.
export const THEME_STORAGE_KEY = "talkeo-theme";

/**
 * Puts the chosen theme on `<html>` before the browser paints. The document is
 * prerendered with one theme baked into the class list, so anything that runs
 * later — an effect, a deferred script — lands after the wrong one is on
 * screen. Reading `localStorage` throws under some privacy settings; falling
 * through leaves the prerendered theme.
 */
export const themeBootstrapScript = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.classList.toggle("dark",t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}`;

export function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function writeTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // No storage: the class still applies, the choice just does not survive.
  }
}
