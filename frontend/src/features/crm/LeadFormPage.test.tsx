import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/shared/types";

/**
 * Characterisation test for the lead card: it pins the behaviour users rely on
 * so the screen can be reorganised without silently losing a piece of it.
 */
const STAGES = [
  { id: 1, name: "Новый", sequence: 1, is_closed: false, color: "purple" },
  { id: 2, name: "ЛПР", sequence: 2, is_closed: false, color: "green" },
];

const LEAD: Lead = {
  id: 1,
  name: 'ООО ТД "АВТОСНАБ-УРАЛ"',
  inn: "7430024870",
  kpp: "743001001",
  timezone: "МСК+2",
  company_email: "info@autosnab.ru",
  phone: "+7 351 200-00-00",
  logist_email: "logist@etalonshina.ru",
  logist_contact: "+79512490606",
  logist_phone: "",
  credit_limit: "150000.00",
  first_call_date: "2026-06-23",
  next_call_date: null,
  priority: 2,
  stage: 1,
  stage_name: "Новый",
  tags: [],
  assigned_to: 1,
  assigned_to_email: "admin@crm.local",
  assigned_to_name: "Иван Костылев",
  is_archived: false,
};

const TIMELINE = [
  {
    id: "note-1",
    type: "note",
    author_name: "Иван Костылев",
    author_initials: "ИК",
    body: "Договор во вложении",
    attachments: [
      {
        id: 7,
        name: "договор.pdf",
        size: 204800,
        content_type: "application/pdf",
        uploaded_by: 1,
        uploaded_by_name: "Иван Костылев",
        created_at: "2026-09-28T10:00:00Z",
      },
    ],
    created_at: "2026-09-28T10:00:00Z",
  },
];

const patch = vi.fn(async (_url: string, _payload?: unknown) => ({ data: LEAD }));
const remove = vi.fn(async (_url: string) => ({ data: {} }));
const post = vi.fn(async (_url: string, _payload?: unknown) => ({ data: {} }));

vi.mock("@/shared/api/client", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url.startsWith("/crm/stages")) return { data: { results: STAGES } };
      if (url.startsWith("/crm/tags")) return { data: { results: [] } };
      if (url === "/crm/leads/1/") return { data: LEAD };
      if (url.startsWith("/crm/leads/?")) return { data: { count: 42, results: [{ id: 1 }] } };
      if (url.includes("timeline")) return { data: TIMELINE };
      if (url.includes("download")) {
        return { data: new Blob(["содержимое файла"], { type: "text/plain" }) };
      }
      if (url.includes("attachments")) {
        return {
          data: [
            {
              id: 7,
              name: "заметки.txt",
              size: 64,
              content_type: "text/plain",
              uploaded_by: 1,
              uploaded_by_name: "Иван Костылев",
              created_at: "2026-09-28T10:00:00Z",
            },
          ],
        };
      }
      return { data: { results: [] } };
    }),
    post,
    patch,
    delete: remove,
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

const { LeadFormPage } = await import("./LeadFormPage");

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

function renderForm() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/crm/leads/1"]}>
        <Routes>
          <Route path="/crm/leads/:id" element={<LeadFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("lead card", () => {
  it("shows the record with its fields, stages and header actions", async () => {
    renderForm();

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("Название лида").value).toBe(
        'ООО ТД "АВТОСНАБ-УРАЛ"',
      ),
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^ИНН/).value).toBe("7430024870");
    expect(screen.getByLabelText<HTMLInputElement>("КПП").value).toBe("743001001");
    expect(screen.getByLabelText<HTMLInputElement>("Лимит").value).toBe("150000.00");
    expect(screen.getByLabelText<HTMLInputElement>("Дата первого звонка").value).toBe("2026-06-23");

    // "Новый" is both a stage and the create button, so pick the stage by its role in the flow.
    const currentStage = screen
      .getAllByRole("button", { name: "Новый" })
      .find((el) => el.getAttribute("aria-current") === "step");
    expect(currentStage, "current stage must be marked").toBeTruthy();
    expect(screen.getByRole("button", { name: "Создать заявку" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Проигрыш" })).toBeTruthy();
    expect(screen.getAllByText("Иван Костылев").length).toBeGreaterThan(0);
  });

  it("offers to save only after something changes and sends what changed", async () => {
    renderForm();
    const kpp = await screen.findByLabelText<HTMLInputElement>("КПП");
    expect(screen.queryByLabelText("Сохранить")).toBeNull();

    fireEvent.change(kpp, { target: { value: "743001002" } });
    expect(screen.getByLabelText("Сохранить")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Сохранить"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    const payload = patch.mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(payload.kpp).toBe("743001002");
    expect(payload.next_call_date).toBeNull();
  });

  it("discards edits back to the stored values", async () => {
    renderForm();
    const kpp = await screen.findByLabelText<HTMLInputElement>("КПП");

    fireEvent.change(kpp, { target: { value: "000000000" } });
    fireEvent.click(screen.getByLabelText("Отменить изменения"));

    await waitFor(() => expect(kpp.value).toBe("743001001"));
    expect(screen.queryByLabelText("Сохранить")).toBeNull();
  });

  it("switches stage immediately without marking the form unsaved", async () => {
    renderForm();
    await screen.findByLabelText("КПП");

    fireEvent.click(screen.getByRole("button", { name: "ЛПР" }));

    await waitFor(() => expect(patch).toHaveBeenCalledWith("/crm/leads/1/", { stage: 2 }));
    await waitFor(() => expect(screen.queryByLabelText("Сохранить")).toBeNull());
  });

  it("lists the record pager and walks to the neighbour", async () => {
    renderForm();

    expect(await screen.findByText("1 / 42")).toBeTruthy();
    expect(screen.getByLabelText<HTMLButtonElement>("Предыдущий лид").disabled).toBe(true);
  });

  it("archives the lead from the actions menu", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    fireEvent.click(await screen.findByLabelText("Действия"));
    fireEvent.click(screen.getByRole("button", { name: "Архивировать" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("/crm/leads/1/"));
    vi.restoreAllMocks();
  });

  it("opens a text attachment for preview and can delete it", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    fireEvent.click(await screen.findByLabelText("Вложения: 1"));
    fireEvent.click(screen.getByRole("button", { name: "заметки.txt" }));

    const dialog = await screen.findByRole("dialog", { name: /заметки\.txt/ });
    // The file is fetched and decoded before it can be shown.
    await waitFor(() => expect(dialog.textContent).toContain("содержимое файла"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByLabelText("Удалить заметки.txt"));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("/crm/leads/1/attachments/7/"));
    vi.restoreAllMocks();
  });

  it("shows the feed with its attachment and accepts a new note", async () => {
    renderForm();

    expect(await screen.findByText("Договор во вложении")).toBeTruthy();
    expect(screen.getByTitle(/договор\.pdf/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Записать внутреннее примечание…"), {
      target: { value: "Перезвонить в пятницу" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Записать" }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls.at(-1)! as [string, FormData];
    expect(url).toBe("/crm/leads/1/notes/");
    expect(body.get("body")).toBe("Перезвонить в пятницу");
  });
});
