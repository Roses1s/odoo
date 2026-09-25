import { describe, expect, it } from "vitest";
import { innChecksumOk } from "./inn";

describe("innChecksumOk", () => {
  it("accepts valid 10-digit INN", () => {
    expect(innChecksumOk("7707083893")).toBe(true);
  });
  it("rejects invalid INN", () => {
    expect(innChecksumOk("1234567890")).toBe(false);
  });
});
