import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { unwrapList } from "@/shared/lib/http";
import { Button } from "@/shared/ui/button";

interface BackupFile {
  name: string;
  size: number;
}

interface BackupsResponse {
  results: BackupFile[];
  last_backup_at: string | null;
  age_hours: number | null;
  is_stale: boolean;
}

function staleMessage(ageHours: number | null): string {
  if (ageHours === null) return "Резервных копий нет. Проверьте, работает ли celery.";
  const days = Math.floor(ageHours / 24);
  const age = days >= 1 ? `${days} дн.` : `${Math.round(ageHours)} ч.`;
  return `Последней копии уже ${age}. Похоже, ночная задача не отрабатывает — проверьте celery.`;
}

export function SecurityPage() {
  const qc = useQueryClient();
  const attempts = useQuery({
    queryKey: ["login-attempts"],
    queryFn: async () =>
      unwrapList<{ id: number; username: string; ip_address: string; attempt_time: string; failures: number }>(
        (await api.get("/admin/login-attempts/")).data,
      ),
  });
  const backups = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const { data } = await api.get<BackupsResponse>("/admin/backups/");
      return {
        files: unwrapList<BackupFile>(data),
        isStale: Boolean(data?.is_stale),
        ageHours: data?.age_hours ?? null,
      };
    },
  });
  const run = useMutation({
    mutationFn: () => api.post("/admin/backup/"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backups"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2>Бэкапы</h2>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            Запустить бэкап
          </Button>
        </div>
        {backups.data?.isStale && (
          <p
            role="alert"
            className="mb-3 rounded-[4px] border border-odoo-danger/40 bg-odoo-danger/10 px-3 py-2 text-sm text-odoo-danger"
          >
            {staleMessage(backups.data.ageHours)}
          </p>
        )}
        <ul className="text-sm">
          {(backups.data?.files ?? []).map((b) => (
            <li key={b.name} className="border-b border-odoo-border-light py-1.5">
              {b.name} <span className="text-odoo-text-muted">({Math.round(b.size / 1024)} КБ)</span>
            </li>
          ))}
          {(backups.data?.files ?? []).length === 0 && (
            <li className="text-odoo-text-muted">Файлов нет</li>
          )}
        </ul>
      </div>
      <div>
        <h2 className="mb-3">Попытки входа (axes)</h2>
        <table className="w-full text-sm">
          <thead className="bg-odoo-bg text-xs uppercase text-odoo-text-muted">
            <tr>
              <th className="p-2 text-left">Пользователь</th>
              <th className="p-2 text-left">IP</th>
              <th className="p-2 text-left">Время</th>
              <th className="p-2 text-left">Неудач</th>
            </tr>
          </thead>
          <tbody>
            {(attempts.data ?? []).map((a) => (
              <tr key={a.id} className="border-b border-odoo-border-light">
                <td className="p-2">{a.username}</td>
                <td className="p-2">{a.ip_address}</td>
                <td className="p-2">{a.attempt_time}</td>
                <td className="p-2">{a.failures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
