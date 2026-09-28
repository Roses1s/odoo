import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "crm-theme";

/**
 * Theme handling mirrors Odoo: an explicit per-user switch in the user menu,
 * remembered between sessions, defaulting to light. Unlike Odoo we only swap
 * CSS variables, so the change is instant and needs no reload.
 */
function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function currentFromDom(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let theme: Theme = typeof document === "undefined" ? "light" : (readStored() ?? currentFromDom());
const listeners = new Set<() => void>();

/** Applies the theme to the document. The same logic runs inline in index.html
 *  before the first paint, otherwise a dark user would see a white flash. */
export function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.style.colorScheme = next;
}

export function getTheme(): Theme {
  return theme;
}

export function setTheme(next: Theme) {
  theme = next;
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private mode or blocked storage: the theme still applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export function toggleTheme() {
  setTheme(theme === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
}
