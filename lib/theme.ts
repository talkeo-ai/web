export type Theme = "light" | "dark";

// Namespaced: in development every app on `localhost` shares one storage area.
export const THEME_STORAGE_KEY = "talkeo-theme";

/**
 * Puts the chosen theme on `<html>` before the browser paints. The document is
 * prerendered with one theme baked into the class list, so anything that runs
 * later — an effect, a deferred script — lands after the wrong one is on
 * screen. Reading `localStorage` throws under some privacy settings; falling
 * through leaves the prerendered theme.
 *
 * Light unless the person chose dark, whatever the system says: dark text on a
 * light ground reads better at every age and more so at small sizes
 * (Piepenbrock et al., Ergonomics 2013; Human Factors 2014), and the four
 * top-earning language apps all open light (Joaquin, 1/nov). Dark stays one
 * click away and is remembered.
 */
/**
 * Whether people can switch to dark. Off (Joaquin, 1/nov): the landing is
 * built on a daylight sky and has no dark counterpart yet. Everything dark
 * stays in place — the tokens, the toggle, this script — so turning it back on
 * is this one value.
 */
export const DARK_MODE_ENABLED = false;

const STORAGE = JSON.stringify(THEME_STORAGE_KEY);

/**
 * With dark off, the script forces light, forgets a stored "dark" from before,
 * and keeps watching `<html>`: a `dark` class added later — by stale code or
 * by hand in the inspector — is taken straight back off, so the page cannot be
 * flipped into a theme that is not designed.
 */
export const themeBootstrapScript = DARK_MODE_ENABLED
  ? `try{document.documentElement.classList.toggle("dark",localStorage.getItem(${STORAGE})==="dark")}catch(e){}`
  : `(function(){var h=document.documentElement;h.classList.remove("dark");try{localStorage.removeItem(${STORAGE})}catch(e){}new MutationObserver(function(){if(h.classList.contains("dark"))h.classList.remove("dark")}).observe(h,{attributes:true,attributeFilter:["class"]})})()`;

export function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function writeTheme(theme: Theme): void {
  if (!DARK_MODE_ENABLED) return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // No storage: the class still applies, the choice just does not survive.
  }
}
