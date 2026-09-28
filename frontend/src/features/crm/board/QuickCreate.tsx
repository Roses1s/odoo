// Extracted from KanbanPage: the board screen had grown past nine hundred
// lines with data fetching, widgets and markup in one file.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";

export function QuickCreate({ stageId, onDone }: { stageId: number; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const create = useMutation({
    mutationFn: () => {
      const n = normalizeInn(inn);
      if ((n.length !== 10 && n.length !== 12) || !innChecksumOk(n)) {
        throw new Error("inn");
      }
      return api.post("/crm/leads/", { name, inn: n, stage: stageId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["stages"] });
      setName("");
      setInn("");
      onDone();
    },
  });
  return (
    <form
      className="border-b border-odoo-border-light bg-odoo-surface px-2.5 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && inn.trim()) create.mutate();
      }}
    >
      <div className="border border-odoo-accent-line bg-odoo-surface shadow-sm focus-within:ring-1 focus-within:ring-odoo-accent-line">
        <input
          autoFocus
          className="block h-8 w-full border-b border-odoo-border-light px-2 text-[13px] outline-none placeholder:text-odoo-text-light"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="block h-8 w-full px-2 text-[13px] outline-none placeholder:text-odoo-text-light"
          placeholder="ИНН"
          inputMode="numeric"
          value={inn}
          onChange={(e) => setInn(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-[3px] bg-odoo-primary px-3 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          disabled={create.isPending || !name.trim() || !inn.trim()}
        >
          {create.isPending ? "Добавление…" : "Добавить"}
        </button>
        <button
          type="button"
          className="px-1 py-1 text-[12px] text-odoo-text-muted hover:text-odoo-text"
          onClick={onDone}
        >
          Отмена
        </button>
      </div>
      {create.isError && <p className="mt-1.5 text-[11px] text-odoo-danger">Проверьте ИНН</p>}
    </form>
  );
}
