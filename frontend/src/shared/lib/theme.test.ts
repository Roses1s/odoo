import { beforeEach, describe, expect, it } from "vitest";
import preloadScript from "../../../public/theme.js?raw";
import html from "../../../index.html?raw";
import { applyTheme, getTheme, setTheme, THEME_KEY, toggleTheme } from "./theme";

describe("theme switching", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    setTheme("light");
  });

  it("marks the document and the color scheme", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("remembers the choice", () => {
    setTheme("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(getTheme()).toBe("dark");

    setTheme("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("toggles between the two themes", () => {
    toggleTheme();
    expect(getTheme()).toBe("dark");
    toggleTheme();
    expect(getTheme()).toBe("light");
  });
});

describe("pre-paint script", () => {
  it("runs before React mounts", () => {
    // Without this the app would flash white for dark-mode users on every load.
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain('<script src="/theme.js">');
    expect(html.indexOf("/theme.js")).toBeLessThan(html.indexOf("/src/main.tsx"));
  });

  it("is a separate file so the Content-Security-Policy can stay strict", () => {
    // An inline script would be blocked by script-src 'self'.
    expect(html).not.toMatch(/<script>[^<]/);
    expect(preloadScript).toContain(THEME_KEY);
    expect(preloadScript).toContain('classList.add("dark")');
  });
});
