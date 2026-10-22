import { useEffect, useRef, useState } from "react";

import { getSession } from "@/lib/event";
import { formatRub, ticketCountLabel } from "@/lib/format";
import { MAX_PARTICIPANTS, normalizeOrder, parseAge, quoteIfAgesKnown, ticketOf } from "@/lib/rules";
import type { SessionId } from "@/lib/types";

import { Button, Stepper, TextField } from "./ui";

export type DraftPerson = {
  id: string;
  name: string;
  age: string;
};

export function DetailsStep({
  sessionId,
  participants,
  email,
  pending,
  formError,
  onEmail,
  onPerson,
  onAdd,
  onRemove,
  onBack,
  onContinue,
}: {
  sessionId: SessionId;
  participants: DraftPerson[];
  email: string;
  pending: boolean;
  formError: string | null;
  onEmail: (value: string) => void;
  onPerson: (id: string, patch: Partial<DraftPerson>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const session = getSession(sessionId);
  const countWas = useRef(participants.length);

  const result = normalizeOrder({
    email,
    participants: participants.map((person) => ({ name: person.name, age: person.age })),
  });
  const errors = result.ok ? [] : result.errors;
  const quote = quoteIfAgesKnown(participants.map((person) => ({ name: person.name, age: person.age })));
  const companion = errors.find((error) => error.path === "companion");

  useEffect(() => {
    if (participants.length > countWas.current) {
      const last = participants[participants.length - 1];
      if (last) document.getElementById(`name-${last.id}`)?.focus();
    }
    countWas.current = participants.length;
  }, [participants]);

  function visibleError(path: string, touchKey: string): string | undefined {
    const error = errors.find((item) => item.path === path);
    if (!error) return undefined;
    if (submitted || touched[touchKey]) return error.message;
    return undefined;
  }

  function focusError(path: string) {
    if (path === "email") {
      document.getElementById("order-email")?.focus();
      return;
    }
    if (path === "companion" || path === "participants") {
      document.getElementById("companion-alert")?.focus();
      return;
    }
    const match = /^participants\.(\d+)\.(name|age)$/.exec(path);
    if (!match) return;
    const person = participants[Number(match[1])];
    if (!person) return;
    const field = match[2] === "age" ? "age" : "name";
    document.getElementById(`${field}-${person.id}`)?.focus();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!result.ok) {
      const first = result.errors[0];
      if (first) focusError(first.path);
      return;
    }
    onContinue();
  }

  const full = quote?.lines.filter((line) => line.kind === "full").length ?? 0;
  const child = quote?.lines.filter((line) => line.kind === "child").length ?? 0;
  const caption = [ticketCountLabel(full, "full"), ticketCountLabel(child, "child")].filter(Boolean).join(" · ");
  const hint = formError
    ? formError
    : companion
      ? "Исправьте состав заказа, чтобы продолжить."
      : submitted && errors[0]
        ? errors[0].message
        : errors.length
          ? "Нужны имя и возраст каждого участника и один email на заказ."
          : "На следующем шаге можно всё изменить. Места до подтверждения не резервируются.";
  const hintIsError = Boolean(formError || companion || (submitted && errors.length));

  return (
    <section>
      <Stepper current="details" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight">Участники</h2>
        <p className="text-sm text-muted">
          {participants.length} из {MAX_PARTICIPANTS}
        </p>
      </div>
      <p className="mt-3 text-sm text-muted">
        {session.time} · {session.label}
      </p>
      <Button variant="ghost" className="mt-1 min-h-11" onClick={onBack}>
        Изменить сеанс
      </Button>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        {companion ? (
          <p
            id="companion-alert"
            role="alert"
            tabIndex={-1}
            className="rounded-2xl bg-clay-soft px-4 py-3 text-sm leading-relaxed text-clay outline-none"
          >
            {companion.message}
          </p>
        ) : null}

        {participants.map((person, index) => {
          const age = parseAge(person.age);
          const ticket = age.ok ? ticketOf(age.age) : null;
          return (
            <article key={person.id} className="rounded-2xl border border-line bg-sheet p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">Участник {index + 1}</h3>
                  {ticket ? (
                    <p className="mt-1 text-sm text-muted">
                      {ticket.label} · {formatRub(ticket.price)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Цена появится после возраста</p>
                  )}
                </div>
                {participants.length > 1 ? (
                  <Button
                    variant="ghost"
                    className="min-h-11 shrink-0 px-1"
                    onClick={() => onRemove(person.id)}
                    aria-label={`Убрать участника ${index + 1}`}
                  >
                    Убрать
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                <TextField
                  id={`name-${person.id}`}
                  label="Имя"
                  autoComplete="off"
                  maxLength={80}
                  value={person.name}
                  error={visibleError(`participants.${index}.name`, `name-${person.id}`)}
                  onBlur={() => setTouched((current) => ({ ...current, [`name-${person.id}`]: true }))}
                  onChange={(event) => onPerson(person.id, { name: event.target.value })}
                />
                <TextField
                  id={`age-${person.id}`}
                  label="Возраст"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  placeholder="полных лет"
                  value={person.age}
                  error={visibleError(`participants.${index}.age`, `age-${person.id}`)}
                  onBlur={() => setTouched((current) => ({ ...current, [`age-${person.id}`]: true }))}
                  onChange={(event) => onPerson(person.id, { age: event.target.value.replace(/\D/g, "").slice(0, 3) })}
                />
              </div>
            </article>
          );
        })}

        <Button variant="secondary" onClick={onAdd} disabled={participants.length >= MAX_PARTICIPANTS}>
          {participants.length >= MAX_PARTICIPANTS ? "В заказе уже 4 участника" : "Добавить участника"}
        </Button>

        <TextField
          id="order-email"
          label="Email для билетов"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          maxLength={120}
          placeholder="один адрес на весь заказ"
          value={email}
          error={visibleError("email", "email")}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          onChange={(event) => onEmail(event.target.value)}
        />

        <div className="rounded-2xl bg-sheet px-4 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Итого</p>
              {caption ? <p className="mt-0.5 text-sm text-muted">{caption}</p> : null}
            </div>
            <p className="text-2xl font-semibold tabular-nums">{quote ? formatRub(quote.total) : "—"}</p>
          </div>
        </div>

        <p className={`text-sm leading-relaxed ${hintIsError ? "text-clay" : "text-muted"}`}>{formError ?? hint}</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Проверяем места…" : "Проверить заказ"}
        </Button>
      </form>
    </section>
  );
}
