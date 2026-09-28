import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ crash }: { crash: boolean }): React.ReactNode {
  if (crash) throw new Error("Не удалось отрисовать карточку");
  return <p>Содержимое страницы</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error itself; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children while nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom crash={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Содержимое страницы")).toBeTruthy();
  });

  it("shows an explanation and the failure reason instead of a blank page", () => {
    render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Что-то пошло не так");
    expect(alert.textContent).toContain("Не удалось отрисовать карточку");
    expect(screen.getByRole("button", { name: "Перезагрузить страницу" })).toBeTruthy();
  });

  it("retries rendering when asked", () => {
    // A flag outside the component: React re-invokes a throwing component in
    // development to build the stack, so the failure must be stable across
    // both renders, not toggled from inside.
    let shouldCrash = true;
    function Flaky() {
      if (shouldCrash) throw new Error("временный сбой");
      return <p>Снова работает</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(screen.getByText("Снова работает")).toBeTruthy();
  });

  it("supports a custom fallback", () => {
    render(
      <ErrorBoundary fallback={() => <p>Виджет недоступен</p>}>
        <Boom crash />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Виджет недоступен")).toBeTruthy();
  });
});
