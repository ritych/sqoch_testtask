import { formatRub, ticketCountLabel, yearsLabel } from "@/lib/format";
import type { QuoteLine } from "@/lib/types";

export function Composition({ lines }: { lines: (QuoteLine & { seat?: string })[] }) {
  return (
    <ul>
      {lines.map((line, index) => (
        <li key={`${line.name}-${line.age}-${index}`} className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0">
          <div className="min-w-0">
            <p className="break-words font-medium">{line.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              {yearsLabel(line.age)} · {line.kind === "child" ? "детский билет" : "полный билет"}
              {line.seat ? ` · ${line.seat}` : ""}
            </p>
          </div>
          <p className="shrink-0 font-medium tabular-nums">{formatRub(line.price)}</p>
        </li>
      ))}
    </ul>
  );
}

export function TotalRow({ total, lines }: { total: number; lines: QuoteLine[] }) {
  const full = lines.filter((line) => line.kind === "full").length;
  const child = lines.filter((line) => line.kind === "child").length;
  const caption = [ticketCountLabel(full, "full"), ticketCountLabel(child, "child")].filter(Boolean).join(" · ");

  return (
    <div className="flex items-end justify-between gap-4 border-t border-ink pt-3">
      <div>
        <p className="text-sm text-muted">Итого</p>
        {caption ? <p className="mt-0.5 text-sm text-muted">{caption}</p> : null}
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatRub(total)}</p>
    </div>
  );
}
