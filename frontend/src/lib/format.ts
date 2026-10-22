export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function yearsLabel(age: number): string {
  return `${age} ${plural(age, "год", "года", "лет")}`;
}

export function seatsLabel(count: number): string {
  return `${count} ${plural(count, "место", "места", "мест")}`;
}

export function participantsLabel(count: number): string {
  return `${count} ${plural(count, "участник", "участника", "участников")}`;
}

export function ticketCountLabel(count: number, kind: "full" | "child"): string {
  if (count === 0) return "";
  if (kind === "full") {
    return `${count} ${plural(count, "полный билет", "полных билета", "полных билетов")}`;
  }
  return `${count} ${plural(count, "детский билет", "детских билета", "детских билетов")}`;
}
