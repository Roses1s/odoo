import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Lead } from "@/shared/types";

/**
 * A real database holds hundreds of leads. Drawing them all at once is what
 * made the board heavy, so the screen shows a page at a time.
 */
const STAGES = [{ id: 1, name: "Новый", sequence: 1, is_closed: false, color: "purple" }];

const LEADS: Lead[] = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: `Лид ${i + 1}`,
  inn: "7707083893",
  kpp: "",
  timezone: "",
  company_email: null,
  phone: "",
  logist_email: null,
  logist_contact: "",
  logist_phone: "",
  credit_limit: "0.00",
  first_call_date: null,
  next_call_date: null,
  priority: 0,
  stage: 1,
  stage_name: "Новый",
  tags: [],
  assigned_to: 1,
  assigned_to_email: "admin@crm.local",
  assigned_to_name: "Иван Костылев",
  is_archived: false,
}));

vi.mock("@/shared/api/client", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url.startsWith("/crm/stages")) return { data: { results: STAGES } };
      if (url.startsWith("/crm/tags")) return { data: { results: [] } };
      if (url.startsWith("/crm/leads")) return { data: { results: LEADS, next: null } };
      return { data: { results: [] } };
    }),
    post: vi.fn(async () => ({ data: {} })),
    patch: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
}));

vi.mock("@/features/auth/store", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: {
        id: 1,
        email: "admin@crm.local",
        first_name: "Иван",
        last_name: "Костылев",
        role: "admin",
        is_active: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
    }),
}));

const { KanbanPage } = await import("./KanbanPage");

function renderAt(entry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <KanbanPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("lead list paging", () => {
  it("renders a page of rows and reveals the rest on request", async () => {
    const { container } = renderAt("/crm?view=list");

    await waitFor(() => expect(screen.getByText("Лид 1")).toBeTruthy());
    expect(container.querySelectorAll("tbody tr[class*='cursor-pointer']")).toHaveLength(80);
    expect(screen.queryByText("Лид 81")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Показать ещё 40 из 120/ }));

    expect(screen.getByText("Лид 81")).toBeTruthy();
    expect(container.querySelectorAll("tbody tr[class*='cursor-pointer']")).toHaveLength(120);
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).toBeNull();
  });
});

describe("lead list odoo-style controls", () => {
  it("sorts rows by the clicked column header", async () => {
    const { container } = renderAt("/crm?view=list");
    await waitFor(() => expect(screen.getByText("Лид 1")).toBeTruthy());

    const firstColumn = () =>
      Array.from(container.querySelectorAll<HTMLTableCellElement>("tbody td:nth-child(2)")).map(
        (td) => td.textContent,
      );
    // Baseline order: Лид 1 … Лид 80. Names share a prefix, so plain string
    // comparison puts "Лид 10" right after "Лид 1" — assert positions instead.
    expect(firstColumn()[0]).toBe("Лид 1");

    fireEvent.click(screen.getByRole("button", { name: /Название/ }));
    let names = firstColumn();
    expect(names[0]).toBe("Лид 1");
    expect(names.indexOf("Лид 10")).toBe(1);

    // Descending over the visible page (80 rows): "Лид 99" is the largest
    // name lexicographically, so it comes first.
    fireEvent.click(screen.getByRole("button", { name: /Название/ }));
    names = firstColumn();
    expect(names[0]).toBe("Лид 99");
    expect(names[1]).toBe("Лид 98");

    // Third click resets sorting back to the natural order.
    fireEvent.click(screen.getByRole("button", { name: /Название/ }));
    expect(firstColumn()[0]).toBe("Лид 1");
  });

  it("selects rows via checkboxes and shows the selection bar", async () => {
    renderAt("/crm?view=list");
    await waitFor(() => expect(screen.getByText("Лид 1")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Выбрать лид «Лид 1»"));
    fireEvent.click(screen.getByLabelText("Выбрать лид «Лид 2»"));
    expect(screen.getByText("Выбрано записей: 2")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Выбрать все видимые лиды"));
    expect(screen.getByText("Выбрано записей: 80")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Снять выделение" }));
    expect(screen.queryByText(/Выбрано записей/)).toBeNull();
  });

  it("groups rows with headers when grouping is active", async () => {
    const { container } = renderAt("/crm?view=list&group=stage");
    await waitFor(() => expect(screen.getByText("Лид 1")).toBeTruthy());

    // The group header row spans the whole table and carries the count of
    // rows rendered so far (the page limit applies inside groups too).
    const groupHeader = container.querySelector("tbody tr td[colspan]");
    expect(groupHeader?.textContent).toBe("Новый(80)");
  });
});

describe("kanban column paging", () => {
  it("renders a page of cards and reveals the rest on request", async () => {
    renderAt("/crm");

    await waitFor(() => expect(screen.getByText(/Лид 1 —/)).toBeTruthy());
    expect(screen.queryByText(/Лид 21 —/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Показать ещё 20 из 120/ }));

    expect(screen.getByText(/Лид 21 —/)).toBeTruthy();
    expect(screen.queryByText(/Лид 41 —/)).toBeNull();
  });
});
