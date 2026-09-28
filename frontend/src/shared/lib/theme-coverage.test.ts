import { describe, expect, it } from "vitest";

/**
 * Dark mode works because components paint with odoo.* tokens instead of fixed
 * colours. A single `bg-white` slipping back in leaves a bright patch that is
 * easy to miss in review, so the whole component tree is scanned here.
 */
const sources = import.meta.glob("../../{app,features,shared}/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Places where a fixed colour is the correct answer. */
const ALLOWED: Record<string, string> = {
  "Navbar.tsx": "the toggle knob stays white on the coloured track",
  "LoginPage.tsx": "the sign-in card is white on a dark background by design",
};

function allowed(path: string): boolean {
  return Object.keys(ALLOWED).some((file) => path.endsWith(file));
}

describe("theme coverage", () => {
  it("finds the component sources", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });

  it("paints surfaces with tokens, not with fixed white", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !allowed(path))
      .filter(([, code]) => /\bbg-white\b/.test(code))
      .map(([path]) => path.replace("../../", "src/"));

    expect(offenders, "use bg-odoo-surface so the dark theme can repaint it").toEqual([]);
  });
});
