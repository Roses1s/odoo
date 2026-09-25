import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import type { Role, User } from "@/shared/types";
import { Button } from "@/shared/ui/button";

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

const ROLE_ORDER: Record<string, number> = { admin: 0, manager: 1, operator: 2 };
const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  operator: "Operator",
};

type FormState = {
  email: string;
  role: Role;
  password: string;
};

const emptyForm: FormState = { email: "", role: "operator", password: "" };

export function UsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => results<User>((await api.get("/admin/users/")).data),
  });

  const create = useMutation({
    mutationFn: () => api.post("/admin/users/", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setForm(emptyForm);
      setError("");
    },
    onError: () => setError("Не удалось создать пользователя"),
  });

  const update = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = { email: form.email, role: form.role };
      if (form.password.trim()) payload.password = form.password;
      return api.patch(`/admin/users/${editing!.id}/`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditing(null);
      setForm(emptyForm);
      setError("");
    },
    onError: () => setError("Не удалось сохранить"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: () => setError("Нельзя удалить этого пользователя"),
  });

  function startEdit(u: User) {
    setEditing(u);
    setForm({ email: u.email, role: u.role, password: "" });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  return (
    <div>
      <h2 className="mb-4">Пользователи</h2>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label>
          <span className="mb-1 block text-[11px] uppercase text-odoo-text-muted">Email</span>
          <input
            className="rounded border border-odoo-border px-2 py-1.5 text-sm"
            placeholder="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-[11px] uppercase text-odoo-text-muted">
            {editing ? "Новый пароль (пусто = не менять)" : "Пароль"}
          </span>
          <input
            className="rounded border border-odoo-border px-2 py-1.5 text-sm"
            placeholder="пароль"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-[11px] uppercase text-odoo-text-muted">Роль</span>
          <select
            className="rounded border border-odoo-border px-2 py-1.5 text-sm"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          >
            <option value="operator">operator</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
        </label>
        {editing ? (
          <>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>
              Сохранить
            </Button>
            <Button variant="secondary" onClick={cancelEdit}>
              Отмена
            </Button>
          </>
        ) : (
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.email}>
            Создать
          </Button>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-odoo-danger">{error}</p>}
      {editing && (
        <p className="mb-2 text-xs text-odoo-text-muted">
          Редактирование: {editing.email} (id {editing.id})
        </p>
      )}
      <table className="w-full text-sm">
        <thead className="bg-odoo-bg text-xs uppercase text-odoo-text-muted">
          <tr>
            <th className="w-12 p-2 text-left">№</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Роль</th>
            <th className="p-2 text-left">Активен</th>
            <th className="p-2 text-left">Действия</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? [])
            .slice()
            .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.id - b.id)
            .map((u, index) => (
            <tr
              key={u.id}
              className={`h-10 border-b border-odoo-border-light hover:bg-odoo-bg ${
                editing?.id === u.id ? "bg-odoo-bg" : "bg-white"
              }`}
            >
              <td className="p-2 text-odoo-text-muted">{index + 1}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{ROLE_LABEL[u.role] ?? u.role}</td>
              <td className="p-2">{u.is_active ? "да" : "нет"}</td>
              <td className="p-2">
                <button
                  type="button"
                  className="mr-2 text-odoo-primary hover:underline"
                  onClick={() => startEdit(u)}
                >
                  Изменить
                </button>
                <button
                  type="button"
                  className="text-odoo-danger hover:underline"
                  onClick={() => {
                    if (confirm(`Удалить ${u.email}?`)) remove.mutate(u.id);
                  }}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
