import { ReactNode } from "react";
import Link from "next/link";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-paper border border-line rounded-xl ${className}`}>{children}</div>;
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`display text-navy font-bold text-lg ${className}`}>{children}</h2>;
}

export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h1 className="display text-navy font-bold text-2xl">{title}</h1>
      {action}
    </div>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-mute mb-1.5">
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-lg border border-line bg-field px-3 py-2.5 text-ink placeholder:text-mute/60 focus:bg-paper focus:border-blue-bright outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors cursor-pointer disabled:opacity-50";

const variants = {
  primary: "bg-navy text-white hover:bg-blue",
  ghost: "bg-paper border border-line text-navy hover:bg-navy-soft",
  danger: "bg-red-soft text-red hover:bg-red hover:text-white",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`${buttonBase} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonProps & { href: string }) {
  return (
    <Link href={href} className={`${buttonBase} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function StatusPill({ status }: { status: "paid" | "partial" | "unpaid" | string }) {
  const map: Record<string, string> = {
    paid: "bg-green-soft text-green",
    partial: "bg-amber-soft text-amber",
    unpaid: "bg-red-soft text-red",
    active: "bg-blue-soft text-blue",
    draft: "bg-field text-mute",
    completed: "bg-green-soft text-green",
    terminated: "bg-red-soft text-red",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${map[status] ?? "bg-field text-mute"}`}>
      {status}
    </span>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-mute">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-mute">{label}</div>
      <div className="display text-navy font-bold text-2xl tnum mt-1">{value}</div>
      {hint && <div className="text-xs text-mute mt-1">{hint}</div>}
    </Card>
  );
}

/** paid vs total -> the pill state used across lists and detail pages. */
export function payStatus(total: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid <= 0) return "unpaid";
  if (paid + 0.5 >= total) return "paid";
  return "partial";
}

/** Segmented control — used to pick what kind of document is being written. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
              active ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
            }`}
          >
            <div className="font-semibold">{o.label}</div>
            {o.hint && (
              <div className={`text-xs mt-0.5 ${active ? "text-white/70" : "text-mute"}`}>{o.hint}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Optional part of a form, folded away by default. Everything inside has a
 * working default, so an invoice can be saved without ever opening one.
 */
export function Collapse({
  title,
  hint,
  children,
  open = false,
  className = "",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details open={open} className={`group bg-paper border border-line rounded-xl overflow-hidden ${className}`}>
      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none">
        <div>
          <div className="font-semibold text-navy">{title}</div>
          {hint && <div className="text-xs text-mute mt-0.5">{hint}</div>}
        </div>
        <span className="text-mute transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-4 pt-1 border-t border-line">{children}</div>
    </details>
  );
}
