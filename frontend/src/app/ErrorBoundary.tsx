import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of the default screen, e.g. to keep the rest of the page alive. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without a boundary a single render error unmounts the whole React tree and
 * the user is left with a blank page and no way forward. Here they at least
 * see what happened and can retry or reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keeps the stack in the browser console until real error reporting exists.
    console.error("Необработанная ошибка интерфейса:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-odoo-bg px-4 text-center"
      >
        <h1 className="text-[18px] font-semibold text-odoo-text">Что-то пошло не так</h1>
        <p className="max-w-md text-[13px] text-odoo-text-muted">
          Страница не смогла отрисоваться. Данные не потеряны — попробуйте повторить действие или
          перезагрузить страницу.
        </p>
        <p className="max-w-md break-words text-[12px] text-odoo-text-light">{error.message}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="h-8 rounded-[4px] border border-odoo-border bg-odoo-surface px-3 text-[13px] text-odoo-text transition-colors hover:bg-odoo-bg"
          >
            Повторить
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-8 rounded-[4px] bg-odoo-primary px-3 text-[13px] font-medium text-white transition-colors hover:bg-odoo-primary-hover"
          >
            Перезагрузить страницу
          </button>
        </div>
      </div>
    );
  }
}
