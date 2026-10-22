import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-pine px-5 text-base font-semibold text-white transition hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex h-12 w-full items-center justify-center rounded-xl border border-line bg-sheet px-5 text-base font-semibold text-ink transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-60",
  ghost: "text-left text-sm font-medium text-muted underline decoration-line underline-offset-4 transition hover:text-ink disabled:opacity-60",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button type={type} className={`${variants[variant]} ${className}`} {...props} />;
}

export function TextField({
  id,
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2 focus-visible:ring-offset-sheet ${
          error ? "border-clay" : "border-line focus-visible:border-pine"
        }`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-clay">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stepper({ current }: { current: "details" | "review" | "result" }) {
  const steps = [
    { key: "details", label: "Данные" },
    { key: "review", label: "Проверка" },
    { key: "result", label: "Результат" },
  ] as const;
  const index = steps.findIndex((step) => step.key === current);

  return (
    <ol className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {steps.map((step, stepIndex) => {
        const state = stepIndex === index ? "text-ink font-semibold" : stepIndex < index ? "text-ink/75" : "text-muted";
        return (
          <li key={step.key} aria-current={stepIndex === index ? "step" : undefined} className={state}>
            <span className="mr-1.5 tabular-nums">{stepIndex + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function Notice({ tone, title, children }: { tone: "sand" | "clay" | "moss"; title: string; children: ReactNode }) {
  const tones = {
    sand: "bg-sand text-sand-ink",
    clay: "bg-clay-soft text-clay",
    moss: "bg-moss-soft text-moss",
  } as const;

  return (
    <div className={`rounded-2xl px-4 py-4 ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
