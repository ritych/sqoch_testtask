import { eventInfo } from "@/lib/event";
import { participantsLabel, seatsLabel } from "@/lib/format";
import type { OrderResponse, SoldOutResponse } from "@/lib/types";

import { Composition, TotalRow } from "./composition";
import { Button, Notice, Stepper } from "./ui";

export function SuccessStep({ order, onAgain }: { order: OrderResponse; onAgain: () => void }) {
  return (
    <section>
      <Stepper current="result" />
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">Заказ оформлен</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight">Билеты ваши</h2>

      <article className="relative mt-6 rounded-2xl border border-line bg-sheet shadow-[0_18px_50px_rgba(33,30,26,0.06)]">
        <div className="h-1.5 rounded-t-2xl bg-pine" />
        <div className="px-5 pb-5 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{eventInfo.venue}</p>
              <p className="mt-2 font-serif text-3xl leading-none">{eventInfo.title}</p>
            </div>
            <p className="font-serif text-2xl">{order.time}</p>
          </div>
          <p className="mt-3 text-sm text-muted">
            {order.dateLabel} · {order.sessionLabel}
          </p>
          <p className="mt-4 text-sm">
            Заказ <span className="font-semibold tracking-wide">{order.id}</span>
          </p>
        </div>
        <div className="relative px-5 pb-5 sm:px-7">
          <span aria-hidden className="absolute -left-2 top-0 size-4 -translate-y-1/2 rounded-full bg-paper" />
          <span aria-hidden className="absolute -right-2 top-0 size-4 -translate-y-1/2 rounded-full bg-paper" />
          <div className="border-t border-dashed border-line pt-4">
            <Composition lines={order.lines} />
            <div className="pt-1">
              <TotalRow total={order.total} lines={order.lines} />
            </div>
            <p className="mt-4 break-all text-sm text-muted">
              Адрес заказа: <span className="text-ink">{order.email}</span>
            </p>
          </div>
        </div>
      </article>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        Места назначены при подтверждении. В основном зале свободно: {seatsLabel(order.seatsLeft)}. Письмо не
        отправляем — стенд только сохраняет заказ в памяти сервера.
      </p>
      <Button className="mt-6 md:w-auto md:px-8" onClick={onAgain}>
        Новый заказ
      </Button>
    </section>
  );
}

export function SoldOutStep({
  soldOut,
  pending,
  onEdit,
  onMainHall,
  onStart,
}: {
  soldOut: SoldOutResponse;
  pending: boolean;
  onEdit: () => void;
  onMainHall: () => void;
  onStart: () => void;
}) {
  const late = soldOut.sessionId === "late";

  return (
    <section>
      <Stepper current="result" />
      <h2 className="font-serif text-3xl tracking-tight">Места закончились</h2>
      <div className="mt-4">
        <Notice tone="clay" title="Заказ не создан">
          {late
            ? `Пока вы проверяли заказ, места на поздний сеанс закончились. Было ${seatsLabel(soldOut.seatsBefore)}, сейчас ${seatsLabel(soldOut.seatsLeft)}.`
            : `Свободных мест не хватило: в заказе ${participantsLabel(soldOut.quote.lines.length)}, осталось ${seatsLabel(soldOut.seatsLeft)}.`}{" "}
          Оплата не нужна. Состав сохранился — его можно изменить или оформить на другом сеансе.
        </Notice>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-sheet px-4 py-2 sm:px-5">
        <p className="py-3 text-sm text-muted">
          {soldOut.dateLabel} · {soldOut.time} · {soldOut.sessionLabel}
        </p>
        <Composition lines={soldOut.quote.lines} />
        <div className="pb-3">
          <TotalRow total={soldOut.quote.total} lines={soldOut.quote.lines} />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {late ? (
          <Button onClick={onMainHall} disabled={pending}>
            {pending ? "Проверяем основной зал…" : "Перенести в основной зал"}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onEdit} disabled={pending}>
          Изменить данные
        </Button>
        <Button variant="ghost" onClick={onStart}>
          На афишу
        </Button>
      </div>
    </section>
  );
}
