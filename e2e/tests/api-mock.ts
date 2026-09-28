import type { Page, Route } from "@playwright/test";

/**
 * The e2e job starts the frontend dev server only, so the API is answered in
 * the browser. That still exercises what usually breaks: routing, rendering,
 * state, and any runtime error that would leave a blank page.
 */

export const USER = {
  id: 1,
  email: "admin@crm.local",
  first_name: "Иван",
  last_name: "Костылев",
  role: "admin",
  is_active: true,
};

export const STAGES = [
  { id: 1, name: "Новый", sequence: 1, is_closed: false, color: "purple" },
  { id: 2, name: "Не дозвонились", sequence: 2, is_closed: false, color: "orange" },
  { id: 3, name: "ЛПР", sequence: 3, is_closed: false, color: "green" },
];

export const TAGS = [{ id: 1, name: "Логистика", color: "blue" }];

function lead(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `ООО «Клиент ${id}»`,
    inn: "7707083893",
    kpp: "",
    timezone: "",
    company_email: null,
    phone: "",
    logist_email: `logist${id}@example.ru`,
    logist_contact: "+79512490606",
    logist_phone: "",
    credit_limit: "0.00",
    first_call_date: null,
    next_call_date: null,
    priority: 1,
    stage: 1,
    stage_name: "Новый",
    tags: [],
    assigned_to: 1,
    assigned_to_email: USER.email,
    assigned_to_name: "Иван Костылев",
    is_archived: false,
    ...overrides,
  };
}

export const LEADS = [
  lead(1, { name: 'ООО ТД "АВТОСНАБ-УРАЛ"', stage: 3, stage_name: "ЛПР", tags: TAGS }),
  ...Array.from({ length: 24 }, (_, i) => lead(i + 2)),
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

interface MockOptions {
  /** Signed out: refresh fails, the app must send the user to /login. */
  anonymous?: boolean;
  /** Collects every mutating call so a test can assert what was sent. */
  onWrite?: (method: string, url: string, payload: unknown) => void;
}

/** True when the suite runs against a real backend instead of the mock. */
export const LIVE = process.env.E2E_LIVE === "1";

export async function mockApi(page: Page, options: MockOptions = {}) {
  if (LIVE) return;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();

    if (method !== "GET") {
      let payload: unknown = null;
      try {
        payload = request.postDataJSON();
      } catch {
        payload = request.postData();
      }
      options.onWrite?.(method, path, payload);
    }

    if (path === "/auth/refresh/" || path === "/auth/login/") {
      if (options.anonymous && path === "/auth/refresh/") {
        return json(route, { detail: "Refresh token отсутствует" }, 401);
      }
      return json(route, { access: "e2e-token", user: USER });
    }
    if (path === "/auth/me/") return json(route, USER);
    if (path === "/auth/logout/") return json(route, {}, 204);

    if (path === "/crm/stages/") return json(route, { count: STAGES.length, results: STAGES });
    if (path === "/crm/tags/") return json(route, { count: TAGS.length, results: TAGS });

    if (path === "/crm/leads/") {
      if (method === "POST") return json(route, LEADS[0], 201);
      return json(route, { count: LEADS.length, next: null, results: LEADS });
    }

    const detail = path.match(/^\/crm\/leads\/(\d+)\/$/);
    if (detail) {
      const found = LEADS.find((l) => l.id === Number(detail[1])) ?? LEADS[0];
      return json(route, found);
    }

    if (path.includes("/timeline/")) {
      return json(route, [
        {
          id: "h-1",
          type: "history",
          author_name: "Иван Костылев",
          author_initials: "ИК",
          body: "Сменил этап: Новый → ЛПР",
          field_label: "Этапы лидов",
          old_value: "Новый",
          new_value: "ЛПР",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    if (path.includes("/attachments/")) return json(route, []);
    if (path.includes("/shipments/")) return json(route, { count: 0, results: [] });
    if (path === "/notifications/") return json(route, { count: 0, results: [] });
    if (path === "/launcher/apps/") {
      return json(route, {
        count: 1,
        results: [
          {
            id: 1,
            slug: "crm",
            name: "CRM",
            description: "Лиды",
            icon: "briefcase",
            route: "/crm",
            min_role: "operator",
          },
        ],
      });
    }

    return json(route, { count: 0, results: [] });
  });
}
