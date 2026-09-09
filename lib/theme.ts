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

/**
 * Put the chosen theme back on `<html>`, from wherever the app is running.
 *
 * ⚠ The bootstrap script above runs when the PARSER reaches it, and a
 * client-side navigation never parses a document — so switching site language,
 * which is a real link between two locale segments, re-renders the root layout
 * and leaves the class list as the server wrote it: light. Reloading was the
 * only way back. React says so out loud in development: "scripts inside React
 * components are never executed when rendering on the client".
 *
 * The script stays, because it is the only thing early enough for the FIRST
 * paint. This is the same decision, re-applied for a paint the script cannot
 * reach.
 */
export function applyTheme(): void {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    document.documentElement.classList.toggle(
      "dark",
      stored
        ? stored === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches,
    );
  } catch {
    // No storage: leave whatever is on the element.
  }
}

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
