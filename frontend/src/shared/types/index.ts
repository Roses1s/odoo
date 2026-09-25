export type Role = "admin" | "manager" | "operator";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
}

export interface LauncherApp {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  min_role: Role;
}

export interface Stage {
  id: number;
  name: string;
  sequence: number;
  is_closed: boolean;
  color: string;
  leads_count?: number;
  revenue_sum?: string | number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Lead {
  id: number;
  name: string;
  inn: string;
  logist_email: string | null;
  logist_contact: string;
  priority: number;
  expected_revenue: string;
  stage: number;
  stage_name: string;
  tags: Tag[];
  assigned_to: number | null;
  assigned_to_email?: string;
  is_archived: boolean;
}

export interface TimelineEntry {
  id: string;
  type: "note" | "history" | "message" | "activity";
  author_name: string;
  author_initials: string;
  body: string;
  created_at: string;
}

export interface Shipment {
  id: number;
  lead: number;
  lead_name: string;
  status: string;
  city_loading: string;
  city_unloading: string;
  route: string;
  carrier: number | null;
  carrier_name?: string;
  created_at: string;
}
