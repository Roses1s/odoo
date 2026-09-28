import { beforeEach, describe, expect, it } from "vitest";
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
  it("applies the stored theme before React mounts", () => {
    // Without this the app would flash white for dark-mode users on every load.
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain(THEME_KEY);
    expect(head).toContain("classList.add(\"dark\")");
    expect(html.indexOf(THEME_KEY)).toBeLessThan(html.indexOf("/src/main.tsx"));
  });
});
