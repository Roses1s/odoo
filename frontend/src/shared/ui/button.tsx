import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary:
      "bg-odoo-primary text-white hover:bg-odoo-primary-hover",
    secondary:
      "bg-white text-odoo-text border border-odoo-border hover:bg-odoo-bg",
    danger: "bg-odoo-danger text-white hover:opacity-90",
    ghost: "text-odoo-text-muted hover:text-odoo-text hover:bg-odoo-bg",
  };
  return (
    <button
      className={cn(
        "px-4 py-1.5 rounded text-sm font-medium transition-colors duration-150 disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
