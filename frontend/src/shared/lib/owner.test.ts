import { describe, expect, it } from "vitest";
import { ownerInitials, ownerLabel } from "./owner";

describe("ownerLabel", () => {
  it("prefers the full name", () => {
    expect(ownerLabel({ assigned_to_name: "Иван Костылев", assigned_to_email: "ivan@crm.ru" })).toBe(
      "Иван Костылев",
    );
  });

  it("falls back to the email when the account has no name", () => {
    expect(ownerLabel({ assigned_to_name: "  ", assigned_to_email: "ivan@crm.ru" })).toBe(
      "ivan@crm.ru",
    );
  });

  it("returns an empty string when the lead has no owner", () => {
    expect(ownerLabel({})).toBe("");
  });
});

describe("ownerInitials", () => {
  it("takes the first letters of the name", () => {
    expect(ownerInitials({ assigned_to_name: "Иван Костылев" })).toBe("ИК");
  });

  it("uses at most two words", () => {
    expect(ownerInitials({ assigned_to_name: "Зудилкин Марк Николаевич" })).toBe("ЗМ");
  });

  it("falls back to the email prefix", () => {
    expect(ownerInitials({ assigned_to_email: "ivan@detroid.ru" })).toBe("IV");
  });

  it("shows a dash without an owner", () => {
    expect(ownerInitials({})).toBe("—");
  });
});
