import { Download, X } from "lucide-react";
import { useEffect } from "react";
import type { Attachment } from "@/shared/types";

export type PreviewKind = "image" | "pdf" | "text" | "none";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];
const TEXT_EXT = ["txt", "csv", "log", "json", "xml", "md", "yml", "yaml"];

/** What the browser can show inline without extra tooling. */
export function previewKind(file: { content_type?: string; name: string }): PreviewKind {
  const type = (file.content_type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (type.startsWith("image/") || IMAGE_EXT.includes(ext)) return "image";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("text/") || TEXT_EXT.includes(ext)) return "text";
  return "none";
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

export function FilePreview({
  file,
  url,
  text,
  loading = false,
  error,
  onClose,
  onDownload,
}: {
  file: Attachment;
  url?: string;
  text?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kind = previewKind(file);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <button type="button" className="absolute inset-0" aria-label="Закрыть" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Просмотр файла ${file.name}`}
        className="relative flex max-h-full w-full max-w-[900px] flex-col overflow-hidden rounded-[4px] border border-odoo-border bg-odoo-surface shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-odoo-border-light px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-odoo-text" title={file.name}>
            {file.name}
          </span>
          <span className="shrink-0 text-[12px] text-odoo-text-muted">{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-odoo-border bg-odoo-surface px-2 text-[13px] text-odoo-text transition-colors hover:bg-odoo-bg"
          >
            <Download className="h-3.5 w-3.5" />
            Скачать
          </button>
          <button
            type="button"
            aria-label="Закрыть просмотр"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-odoo-text-muted transition-colors hover:bg-odoo-bg hover:text-odoo-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[200px] flex-1 overflow-auto bg-odoo-bg p-3">
          {loading && <p className="py-10 text-center text-[13px] text-odoo-text-muted">Загрузка…</p>}

          {!loading && error && (
            <p role="alert" className="py-10 text-center text-[13px] text-odoo-danger">
              {error}
            </p>
          )}

          {!loading && !error && kind === "image" && url && (
            <img src={url} alt={file.name} className="mx-auto max-h-[70vh] object-contain" />
          )}

          {!loading && !error && kind === "pdf" && url && (
            <iframe src={url} title={file.name} className="h-[70vh] w-full border-0 bg-odoo-surface" />
          )}

          {!loading && !error && kind === "text" && (
            <pre className="whitespace-pre-wrap break-words rounded-[3px] bg-odoo-surface p-3 text-[12px] leading-[18px] text-odoo-text">
              {text}
            </pre>
          )}

          {!loading && !error && kind === "none" && (
            <div className="py-10 text-center">
              <p className="text-[13px] text-odoo-text">
                Предпросмотр для этого типа файла в браузере недоступен.
              </p>
              <p className="mt-1 text-[12px] text-odoo-text-muted">
                Документы Word, Excel и архивы нужно скачать и открыть в своей программе.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
