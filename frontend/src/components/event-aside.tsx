import { eventInfo, getSession } from "@/lib/event";
import { formatRub } from "@/lib/format";
import {
  CHILD_AGE_BELOW,
  CHILD_PRICE,
  COMPANION_AGE,
  FULL_PRICE,
  MAIN_HALL_CAPACITY,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
} from "@/lib/rules";
import type { EventAvailability, SessionId } from "@/lib/types";

import { Button } from "./ui";

export function EventAside({
  seats,
  sessionId,
  showChosenSession,
  showStandNote,
  onReset,
  pending,
}: {
  seats: EventAvailability | null;
  sessionId: SessionId;
  showChosenSession: boolean;
  showStandNote: boolean;
  onReset: () => void;
  pending: boolean;
}) {
  const session = getSession(sessionId);
  const capacity = seats?.mainCapacity ?? MAIN_HALL_CAPACITY;

  return (
    <aside className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{eventInfo.kicker}</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-none tracking-tight md:text-5xl">{eventInfo.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {eventInfo.dateLabel}, {eventInfo.weekday}
        <br />
        {eventInfo.venue}, {eventInfo.city}
        <br />
        {eventInfo.duration}, {eventInfo.intermission}
      </p>

      {showChosenSession ? (
        <p className="mt-4 text-sm font-medium">
          {session.time} · {session.label}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-sheet p-3">
          <p className="text-xs text-muted">Полный билет</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatRub(FULL_PRICE)}</p>
          <p className="mt-1 text-xs text-muted">от {CHILD_AGE_BELOW} лет</p>
        </div>
        <div className="rounded-2xl border border-line bg-sheet p-3">
          <p className="text-xs text-muted">Детский билет</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatRub(CHILD_PRICE)}</p>
          <p className="mt-1 text-xs text-muted">младше {CHILD_AGE_BELOW} лет</p>
        </div>
      </div>

      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        В одном заказе от {MIN_PARTICIPANTS} до {MAX_PARTICIPANTS} участников. Ребёнок младше {CHILD_AGE_BELOW} лет
        проходит только вместе с участником от {COMPANION_AGE} лет. Зал на {capacity} мест.
      </p>

      <p className={`mt-6 max-w-sm text-xs leading-relaxed text-muted ${showStandNote ? "" : "hidden md:block"}`}>
        Учебная касса: деньги не списываются, письма не отправляются. Поздний сеанс специально заканчивается до
        подтверждения. В основном зале места живые — их становится меньше с каждым заказом, до перезапуска сервера.
      </p>
      <Button variant="ghost" className="mt-3" onClick={onReset} disabled={pending}>
        Вернуть места и начать заново
      </Button>
    </aside>
  );
}
