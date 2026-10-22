import type { NormalizedOrder, Quote, QuoteLine, SessionId, TicketKind, ValidationError } from "./types";

/** Полный билет — с этого возраста включительно. Младше — детский. */
export const CHILD_AGE_BELOW = 14;
export const COMPANION_AGE = 18;
export const FULL_PRICE = 2000;
export const CHILD_PRICE = 1000;
export const MIN_PARTICIPANTS = 1;
export const MAX_PARTICIPANTS = 4;
export const MIN_AGE = 0;
export const MAX_AGE = 120;
export const MAIN_HALL_CAPACITY = 8;
export const LATE_SEATS_SHOWN = 3;

const NAME_PATTERN = /^[\p{L}][\p{L}\s.'’-]*[\p{L}]$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function ticketOf(age: number): { kind: TicketKind; price: number; label: string } {
  const kind: TicketKind = age < CHILD_AGE_BELOW ? "child" : "full";
  return {
    kind,
    price: kind === "child" ? CHILD_PRICE : FULL_PRICE,
    label: kind === "child" ? "Детский билет" : "Полный билет",
  };
}

export function buildQuote(participants: { name: string; age: number }[]): Quote {
  const lines: QuoteLine[] = participants.map((person) => {
    const ticket = ticketOf(person.age);
    return {
      name: person.name,
      age: person.age,
      kind: ticket.kind,
      price: ticket.price,
    };
  });
  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.price, 0),
  };
}

export function parseAge(
  value: string | number,
): { ok: true; age: number } | { ok: false; empty: boolean } {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < MIN_AGE || value > MAX_AGE) {
      return { ok: false, empty: false };
    }
    return { ok: true, age: value };
  }

  const trimmed = value.trim();
  if (!trimmed) return { ok: false, empty: true };
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false, empty: false };
  const age = Number(trimmed);
  if (age > MAX_AGE) return { ok: false, empty: false };
  return { ok: true, age };
}

export function quoteIfAgesKnown(
  participants: { name: string; age: string | number }[],
): Quote | null {
  const people: { name: string; age: number }[] = [];
  for (const [index, person] of participants.entries()) {
    const age = parseAge(person.age);
    if (!age.ok) return null;
    const name = typeof person.name === "string" ? person.name.trim().replace(/\s+/g, " ") : "";
    people.push({ name: name || `Участник ${index + 1}`, age: age.age });
  }
  if (!people.length) return null;
  return buildQuote(people);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collapseName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function nameError(value: string): string | null {
  const name = collapseName(value);
  if (!name) return "Укажите имя";
  if (name.length > 80 || !NAME_PATTERN.test(name)) {
    return "Имя — от 2 букв, можно пробел и дефис";
  }
  return null;
}

function emailError(value: string): string | null {
  const email = value.trim();
  if (!email) return "Укажите email — он один на весь заказ";
  if (email.length > 120 || !EMAIL_PATTERN.test(email)) return "Похоже, в email ошибка";
  return null;
}

function companionMessage(ages: number[]): string | null {
  const hasChild = ages.some((age) => age < CHILD_AGE_BELOW);
  const hasCompanion = ages.some((age) => age >= COMPANION_AGE);
  if (!hasChild || hasCompanion) return null;

  const hasTeen = ages.some((age) => age >= CHILD_AGE_BELOW && age < COMPANION_AGE);
  if (hasTeen) {
    return `Ребёнок младше ${CHILD_AGE_BELOW} лет может быть в заказе только вместе с участником от ${COMPANION_AGE} лет. Билет с ${CHILD_AGE_BELOW} до ${COMPANION_AGE - 1} лет — полный, но такой участник не сопровождает ребёнка.`;
  }
  return `Ребёнок младше ${CHILD_AGE_BELOW} лет может попасть на мероприятие только вместе с участником от ${COMPANION_AGE} лет в этом же заказе.`;
}

export function normalizeOrder(input: {
  email: string;
  participants: { name: string; age: string | number }[];
}): { ok: true; value: Omit<NormalizedOrder, "sessionId"> } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (input.participants.length < MIN_PARTICIPANTS || input.participants.length > MAX_PARTICIPANTS) {
    errors.push({
      path: "participants",
      message: `В одном заказе от ${MIN_PARTICIPANTS} до ${MAX_PARTICIPANTS} участников`,
    });
  }

  const people: { name: string; age: number }[] = [];
  let agesComplete = input.participants.length >= MIN_PARTICIPANTS && input.participants.length <= MAX_PARTICIPANTS;

  input.participants.forEach((person, index) => {
    if (index >= MAX_PARTICIPANTS) return;
    const name = nameError(person.name);
    if (name) errors.push({ path: `participants.${index}.name`, message: name });

    const age = parseAge(person.age);
    if (!age.ok) {
      agesComplete = false;
      errors.push({
        path: `participants.${index}.age`,
        message: age.empty ? "Укажите возраст" : `Возраст — целое число от ${MIN_AGE} до ${MAX_AGE}`,
      });
      return;
    }
    if (!name) people.push({ name: collapseName(person.name), age: age.age });
  });

  if (agesComplete) {
    const ages = input.participants.slice(0, MAX_PARTICIPANTS).map((person) => parseAge(person.age));
    if (ages.every((age) => age.ok)) {
      const message = companionMessage(ages.map((age) => (age.ok ? age.age : 0)));
      if (message) errors.push({ path: "companion", message });
    }
  }

  const email = emailError(input.email);
  if (email) errors.push({ path: "email", message: email });

  if (errors.length || people.length !== Math.min(input.participants.length, MAX_PARTICIPANTS)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      email: input.email.trim(),
      participants: people,
    },
  };
}

function coerceParticipant(raw: unknown): { name: string; age: string | number } {
  if (!isRecord(raw)) return { name: "", age: "" };
  const name = typeof raw.name === "string" ? raw.name : "";
  if (typeof raw.age === "number" || typeof raw.age === "string") return { name, age: raw.age };
  return { name, age: "" };
}

export function normalizeRequest(
  body: unknown,
): { ok: true; value: NormalizedOrder } | { ok: false; errors: ValidationError[] } {
  if (!isRecord(body)) {
    return { ok: false, errors: [{ path: "body", message: "Некорректный запрос" }] };
  }

  const errors: ValidationError[] = [];
  const sessionId: SessionId | null = body.sessionId === "main" || body.sessionId === "late" ? body.sessionId : null;
  if (!sessionId) errors.push({ path: "sessionId", message: "Выберите сеанс" });

  const rawParticipants = body.participants;
  const participantsAreList = Array.isArray(rawParticipants);
  if (!participantsAreList) errors.push({ path: "participants", message: "Нужен список участников" });

  const domain = normalizeOrder({
    email: typeof body.email === "string" ? body.email : "",
    participants: participantsAreList ? rawParticipants.map(coerceParticipant) : [],
  });

  if (!domain.ok) {
    for (const error of domain.errors) {
      if (!participantsAreList && error.path === "participants") continue;
      if (typeof body.email !== "string" && error.path === "email") continue;
      errors.push(error);
    }
  }

  if (typeof body.email !== "string") {
    errors.push({ path: "email", message: "Укажите email — он один на весь заказ" });
  }

  if (errors.length || !domain.ok || !sessionId) {
    return { ok: false, errors: errors.length ? errors : [{ path: "body", message: "Некорректный запрос" }] };
  }

  return {
    ok: true,
    value: {
      sessionId,
      email: domain.value.email,
      participants: domain.value.participants,
    },
  };
}
