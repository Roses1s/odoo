import { CloudUpload, Undo2 } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Odoo 17 form primitives.
 *
 * Values are taken from the official 17.0 sources:
 * - addons/web/static/src/views/form/form_controller.scss
 * - addons/web/static/src/views/form/form.variables.scss
 * - addons/web/static/src/views/fields/statusbar/statusbar_field.scss
 * - addons/web/static/src/core/notebook/notebook.scss
 * - addons/web/static/src/scss/primary_variables.scss
 */

const STATUSBAR_HEIGHT = 33; // $o-statusbar-height
const ARROW_WIDTH = 11; // $o-statusbar-arrow-width

export function FormSheetBg({ children }: { children: ReactNode }) {
  // .o_form_sheet_bg: padding-top 8px, padding-x 16px, max-width 1534px, left aligned
  return <div className="w-full max-w-[1534px] px-4 pb-4 pt-2">{children}</div>;
}

export function FormSheet({ children }: { children: ReactNode }) {
  // .o_form_sheet: white, 1px border, radius 4px, padding 16px (24px on lg)
  return (
    <div className="rounded-[4px] border border-odoo-border bg-white p-4 lg:p-6">{children}</div>
  );
}

export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "warning"; children: ReactNode }) {
  const tones = {
    danger: "border-odoo-danger/30 bg-red-50 text-odoo-danger",
    warning: "border-amber-300 bg-amber-50 text-amber-800",
  };
  return (
    <div role="alert" className={`mb-2 rounded-[4px] border px-3 py-2 text-[13px] ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** .o_form_statusbar — white strip on top of the sheet, arrows aligned right. */
export function FormStatusbar({
  items,
  current,
  onSelect,
  disabled = false,
  left,
}: {
  items: { id: number; name: string }[];
  current?: number;
  onSelect: (id: number) => void;
  disabled?: boolean;
  left?: ReactNode;
}) {
  return (
    <div className="-mx-4 mb-4 flex min-h-[33px] flex-wrap items-center justify-between gap-2 border-b border-odoo-border px-4 pb-2 lg:-mx-6 lg:-mt-2 lg:px-6">
      <div className="flex flex-wrap items-center gap-1">{left}</div>
      <div className="flex min-w-0 flex-wrap items-stretch justify-end">
        {items.map((item, i) => {
          const isFirst = i === 0;
          const isLast = i === items.length - 1;
          const active = item.id === current;
          const clip = isFirst
            ? `polygon(0 0, calc(100% - ${ARROW_WIDTH}px) 0, 100% 50%, calc(100% - ${ARROW_WIDTH}px) 100%, 0 100%)`
            : isLast
              ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${ARROW_WIDTH}px 50%)`
              : `polygon(0 0, calc(100% - ${ARROW_WIDTH}px) 0, 100% 50%, calc(100% - ${ARROW_WIDTH}px) 100%, 0 100%, ${ARROW_WIDTH}px 50%)`;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(item.id)}
              title={item.name}
              style={{
                height: STATUSBAR_HEIGHT,
                clipPath: items.length > 1 ? clip : undefined,
                marginLeft: isFirst ? 0 : -(ARROW_WIDTH - 2),
              }}
              className={`max-w-[200px] truncate text-[13px] font-bold transition-colors disabled:cursor-wait ${
                isFirst ? "pl-4" : "pl-5"
              } ${isLast ? "pr-4" : "pr-4"} ${
                active
                  ? "bg-[#ddd6dd] text-odoo-text"
                  : "bg-odoo-border text-[#343a40] hover:bg-[#ced4da]"
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** .o_group — two inner groups side by side. */
export function FormGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">{children}</div>;
}

/** .o_inner_group — grid: fit-content(150px) label + flexible value. */
export function InnerGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      {title && (
        <h3 className="mb-2 pb-0.5 text-[13px] font-bold text-odoo-text shadow-[0_1px_0_#e9ecef]">
          {title}
        </h3>
      )}
      <div
        className="grid items-start gap-x-4 gap-y-2"
        style={{ gridTemplateColumns: "fit-content(150px) minmax(0, 1fr)" }}
      >
        {children}
      </div>
    </div>
  );
}

/** .o_form_label + field cell. Must be a direct child of InnerGroup. */
export function Field({
  label,
  htmlFor,
  children,
  muted = false,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <>
      <label
        htmlFor={htmlFor}
        className={`whitespace-nowrap pt-[3px] text-[13px] font-normal leading-[19px] text-odoo-text ${
          muted ? "opacity-[0.66]" : ""
        }`}
      >
        {label}
      </label>
      <div className="min-w-0 text-[13px] leading-[19px] text-odoo-text">{children}</div>
    </>
  );
}

/** .o_input — border appears on hover/focus only. */
export function OdooInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[3px] border border-transparent bg-transparent px-1 py-[2px] text-[13px] leading-[19px] text-odoo-text outline-none transition-colors placeholder:text-odoo-text-light hover:border-odoo-border focus:border-odoo-primary ${className}`}
    />
  );
}

/** .o_notebook — Bootstrap-like tabs used by Odoo. */
export function Notebook({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="mt-2.5">
      <div className="-mx-4 overflow-x-auto lg:-mx-6">
        <div className="flex border-b border-odoo-border bg-white px-4 lg:px-6">
          {tabs.map((tab) => {
            const on = tab.id === current?.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`-mb-px mr-[-1px] rounded-t-[4px] border px-4 py-2 text-[13px] transition-colors ${
                  on
                    ? "border-odoo-border border-b-white bg-white font-medium text-odoo-text"
                    : "border-transparent text-odoo-text-muted hover:border-odoo-border-light"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-b border-odoo-border py-4">{current?.content}</div>
    </div>
  );
}

/** .o_form_status_indicator — save / discard icons, hidden when the record is saved. */
export function FormStatusIndicator({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!dirty) return null;
  return (
    <span className="flex items-center gap-0.5" aria-label="Несохранённые изменения">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        title="Сохранить вручную"
        aria-label="Сохранить"
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-bg hover:text-odoo-text disabled:cursor-wait disabled:opacity-60"
      >
        <CloudUpload className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDiscard}
        disabled={saving}
        title="Отменить изменения"
        aria-label="Отменить изменения"
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-bg hover:text-odoo-text disabled:opacity-60"
      >
        <Undo2 className="h-4 w-4" />
      </button>
    </span>
  );
}
