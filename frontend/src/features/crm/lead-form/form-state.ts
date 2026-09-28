// Shape of the lead card and the conversions around it. Kept apart from the
// screen so the rules — which fields exist, what an empty card looks like,
// what counts as an edit — can be read without scrolling through markup.
import type { Lead } from "@/shared/types";

export const empty = {
  name: "",
  inn: "",
  kpp: "",
  timezone: "",
  company_email: "",
  phone: "",
  logist_email: "",
  logist_contact: "",
  logist_phone: "",
  credit_limit: "0",
  first_call_date: "",
  next_call_date: "",
  priority: 0,
  stage: 0,
  tag_ids: [] as number[],
};

export type FormState = typeof empty;

export function toForm(lead: Lead): FormState {
  return {
    name: lead.name,
    inn: lead.inn,
    kpp: lead.kpp || "",
    timezone: lead.timezone || "",
    company_email: lead.company_email || "",
    phone: lead.phone || "",
    logist_email: lead.logist_email || "",
    logist_contact: lead.logist_contact || "",
    logist_phone: lead.logist_phone || "",
    credit_limit: String(lead.credit_limit ?? "0"),
    first_call_date: lead.first_call_date || "",
    next_call_date: lead.next_call_date || "",
    priority: lead.priority,
    stage: lead.stage,
    tag_ids: lead.tags?.map((t) => t.id) ?? [],
  };
}

export function normalized(state: FormState) {
  return JSON.stringify({ ...state, tag_ids: [...state.tag_ids].sort((a, b) => a - b) });
}
