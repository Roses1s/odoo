import { describe, expect, it } from "vitest";
import css from "@/index.css?raw";

/** The css is imported through Vite, so it arrives already processed and the
 *  formatting differs from the source file — match the selector loosely. */
function block(selector: string): string {
  const match = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{`));
  expect(match, `${selector} block is missing`).not.toBeNull();
  const start = match!.index! + match![0].length;
  const end = css.indexOf("}", start);
  expect(end, `${selector} block is not closed`).toBeGreaterThan(start);
  return css.slice(start, end);
}

function tokens(selector: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of block(selector).matchAll(/--(odoo-[\w-]+):\s*([^;]+);/g)) {
    found[name] = value.trim();
  }
  return found;
}

function hex(rgb: string): string {
  const parts = rgb.split(/\s+/).map(Number);
  expect(parts, `"${rgb}" must be three rgb channels`).toHaveLength(3);
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** The colours the app shipped with. Changing any of them changes the approved
 *  light design, so this list is deliberately hard to edit by accident. */
const LIGHT: Record<string, string> = {
  "odoo-primary": "#714B67",
  "odoo-primary-hover": "#5B3A52",
  "odoo-secondary": "#00A09D",
  "odoo-bg": "#F8F9FA",
  "odoo-surface": "#FFFFFF",
  "odoo-surface-hover": "#FAF8F9",
  "odoo-surface-sunken": "#EEECEE",
  "odoo-column-head": "#FAF9FA",
  "odoo-track": "#DEDCDF",
  "odoo-border": "#DEE2E6",
  "odoo-border-light": "#E9ECEF",
  "odoo-text": "#212529",
  "odoo-text-soft": "#495057",
  "odoo-text-muted": "#6C757D",
  "odoo-text-light": "#ADB5BD",
  "odoo-success": "#28A745",
  "odoo-warning": "#FFC107",
  "odoo-danger": "#DC3545",
  "odoo-info": "#17A2B8",
  "odoo-title-band": "#FDEFF1",
  "odoo-statusbar": "#DEE2E6",
  "odoo-statusbar-text": "#495057",
  "odoo-drop": "#F4F7FB",
  "odoo-accent-soft": "#E9F2F2",
  "odoo-accent-line": "#8FB9B8",
  "odoo-search-divider": "#C8D8D8",
  "odoo-search-icon": "#5F6B70",
  "odoo-search-placeholder": "#8B9397",
  "odoo-search-action": "#4E5C61",
  "odoo-search-action-hover": "#F4F7F7",
  "odoo-chip": "#EEEAEA",
  "odoo-chip-text": "#6F666A",
  "odoo-avatar": "#4B4B55",
  "odoo-link": "#00A09D",
  "odoo-action": "#714B67",
};

describe("light palette", () => {
  const light = tokens(":root");

  it.each(Object.entries(LIGHT))("%s keeps its original colour", (name, expected) => {
    expect(hex(light[name])).toBe(expected);
  });
});

describe("dark palette", () => {
  it("defines every token the light theme defines", () => {
    const missing = Object.keys(tokens(":root")).filter((name) => !(name in tokens(".dark")));
    expect(missing, "tokens without a dark value would stay light").toEqual([]);
  });

  it("uses a dark background and light text", () => {
    const dark = tokens(".dark");
    const channels = (name: string) => dark[name].split(/\s+/).map(Number);
    const luminance = (name: string) => channels(name).reduce((a, b) => a + b, 0) / 3;

    expect(luminance("odoo-bg")).toBeLessThan(60);
    expect(luminance("odoo-surface")).toBeLessThan(90);
    expect(luminance("odoo-surface")).toBeGreaterThan(luminance("odoo-bg"));
    expect(luminance("odoo-text")).toBeGreaterThan(180);
  });

  it("declares color-scheme so native controls follow the theme", () => {
    expect(block(":root")).toContain("color-scheme: light");
    expect(block(".dark")).toContain("color-scheme: dark");
  });
});
