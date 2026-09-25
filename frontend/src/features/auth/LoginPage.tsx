import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/shared/ui/button";

export function LoginPage() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status === 502 || status === 503)
        setError("Бэкенд ещё не готов (502). Подождите 20 сек или перезапустите nginx.");
      else if (status === 423 || status === 429) setError("Слишком много попыток. Подождите и повторите.");
      else if (status >= 500) setError("Ошибка сервера (500). Смотрите docker logs backend.");
      else setError("Неверный email или пароль");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-odoo-dark">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-odoo-dark-light bg-white p-6 shadow-lg"
      >
        <div className="mb-5 text-center">
          <div className="text-lg font-bold text-odoo-primary">Odoo</div>
          <h1 className="mt-1 text-[15px] font-semibold text-odoo-text">Вход в CRM</h1>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm focus:border-odoo-primary focus:outline-none focus:ring-1 focus:ring-odoo-primary"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm focus:border-odoo-primary focus:outline-none focus:ring-1 focus:ring-odoo-primary"
            required
          />
        </label>
        {error && <p className="mb-3 text-sm text-odoo-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Вход…" : "Войти"}
        </Button>
      </form>
    </div>
  );
}
