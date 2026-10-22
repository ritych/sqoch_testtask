import { sessions } from "@/lib/event";
import { seatsLabel } from "@/lib/format";
import type { EventAvailability, SessionId } from "@/lib/types";

import { Button } from "./ui";

export function EventStep({
  sessionId,
  seats,
  seatsFailed,
  onSession,
  onContinue,
}: {
  sessionId: SessionId;
  seats: EventAvailability | null;
  seatsFailed: boolean;
  onSession: (id: SessionId) => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <h2 className="font-serif text-3xl tracking-tight">Выберите сеанс</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Один заказ — один сеанс. Имя и возраст нужны каждому участнику, email — один на всех.
      </p>

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Сеанс</legend>
        {sessions.map((session) => {
          const selected = session.id === sessionId;
          const availability =
            session.id === "late"
              ? `На афише ${seatsLabel(seats?.lateSeatsShown ?? 3)}`
              : seatsFailed
                ? "Не удалось узнать остаток"
                : seats
                  ? seats.mainSeatsLeft === 0
                    ? "Свободных мест нет"
                    : `Свободно: ${seatsLabel(seats.mainSeatsLeft)}`
                  : "Считаем места…";

          return (
            <label
              key={session.id}
              className={`block cursor-pointer rounded-2xl border-2 bg-sheet p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper ${
                selected ? "border-pine" : "border-line hover:border-ink/20"
              }`}
            >
              <input
                type="radio"
                name="session"
                value={session.id}
                checked={selected}
                onChange={() => onSession(session.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-serif text-3xl leading-none">{session.time}</span>
                  <span className="mt-2 block font-medium">{session.label}</span>
                </span>
                <span
                  aria-hidden
                  className={`mt-1 size-4 shrink-0 rounded-full border-2 ${selected ? "border-pine bg-pine" : "border-line"}`}
                />
              </span>
              <span className="mt-3 block text-sm font-medium">{availability}</span>
              {session.id === "main" && seats ? <SeatDots left={seats.mainSeatsLeft} capacity={seats.mainCapacity} /> : null}
              <span className="mt-2 block text-sm leading-relaxed text-muted">{session.description}</span>
            </label>
          );
        })}
      </fieldset>

      <Button className="mt-6 md:w-auto md:px-8" onClick={onContinue}>
        Указать участников
      </Button>
    </section>
  );
}

function SeatDots({ left, capacity }: { left: number; capacity: number }) {
  return (
    <span className="mt-3 flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: capacity }, (_, index) => (
        <span key={index} className={`size-2.5 rounded-full ${index < left ? "bg-pine" : "bg-line"}`} />
      ))}
    </span>
  );
}
