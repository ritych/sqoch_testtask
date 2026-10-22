import { participantsLabel, seatsLabel } from "@/lib/format";
import type { PreviewResponse } from "@/lib/types";

import { Composition, TotalRow } from "./composition";
import { Button, Notice, Stepper } from "./ui";

export function ReviewStep({
  preview,
  pending,
  formError,
  onEdit,
  onConfirm,
}: {
  preview: PreviewResponse;
  pending: boolean;
  formError: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const count = preview.quote.lines.length;

  return (
    <section>
      <Stepper current="review" />
      <h2 className="font-serif text-3xl tracking-tight">Проверка заказа</h2>
      <p className="mt-2 text-sm text-muted">
        {preview.dateLabel} · {preview.time} · {preview.sessionLabel}
      </p>

      <div className="mt-6">
        {preview.availabilityChanged ? (
          <Notice tone="clay" title="Места закончились до подтверждения">
            Пока вы заполняли заказ, на сеансе было {seatsLabel(preview.seatsBefore)}. Сейчас{" "}
            {seatsLabel(preview.seatsLeft)}. Подтверждение не создаст заказ.
          </Notice>
        ) : !preview.enough ? (
          <Notice tone="clay" title="Мест меньше, чем участников">
            Свободно {seatsLabel(preview.seatsLeft)}, в заказе {participantsLabel(count)}. Касса отклонит
            подтверждение.
          </Notice>
        ) : (
          <Notice tone="sand" title={`Свободно: ${seatsLabel(preview.seatsLeft)}`}>
            Бронь появится только после подтверждения. Если к этому моменту мест не хватит, заказ не оформится.
          </Notice>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-sheet px-4 py-2 sm:px-5">
        <p className="border-b border-line py-3 text-sm text-muted">
          Билеты на{" "}
          <span className="break-all font-medium text-ink">{preview.email}</span>
        </p>
        <Composition lines={preview.quote.lines} />
        <div className="pb-3">
          <TotalRow total={preview.quote.total} lines={preview.quote.lines} />
        </div>
      </div>

      {formError ? <p className="mt-4 text-sm text-clay">{formError}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={onEdit} disabled={pending}>
          Изменить данные
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? "Подтверждаем…" : "Подтвердить заказ"}
        </Button>
      </div>
    </section>
  );
}
