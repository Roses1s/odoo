import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { unwrapList } from "@/shared/lib/http";
import { Button } from "@/shared/ui/button";

interface Carrier {
  id: number;
  name: string;
  inn: string;
  is_active: boolean;
}

export function CarriersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const { data } = useQuery({
    queryKey: ["carriers"],
    queryFn: async () => unwrapList<Carrier>((await api.get("/carriers/")).data),
  });
  const create = useMutation({
    mutationFn: () => api.post("/carriers/", { name, inn }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carriers"] });
      setName("");
      setInn("");
    },
  });

  return (
    <div>
      <h2 className="mb-4">Перевозчики</h2>
      <div className="mb-4 flex gap-2">
        <input
          className="rounded border border-odoo-border px-2 py-1.5 text-sm"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-odoo-border px-2 py-1.5 text-sm"
          placeholder="ИНН"
          value={inn}
          onChange={(e) => setInn(e.target.value)}
        />
        <Button onClick={() => create.mutate()}>Добавить</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-odoo-bg text-xs uppercase text-odoo-text-muted">
          <tr>
            <th className="p-2 text-left">Название</th>
            <th className="p-2 text-left">ИНН</th>
            <th className="p-2 text-left">Активен</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((c) => (
            <tr key={c.id} className="border-b border-odoo-border-light bg-odoo-surface">
              <td className="p-2">{c.name}</td>
              <td className="p-2">{c.inn}</td>
              <td className="p-2">{c.is_active ? "да" : "нет"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
