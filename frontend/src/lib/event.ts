import type { SessionId } from "./types";

export const eventInfo = {
  title: "Тихая вода",
  kicker: "Камерный вечер",
  venue: "Зал «Лен»",
  city: "Санкт-Петербург",
  address: "набережная Фонтанки, 14",
  dateLabel: "12 ноября 2026",
  weekday: "четверг",
  duration: "1 час 40 минут",
  intermission: "без антракта",
} as const;

export const sessions = [
  {
    id: "main" as const,
    label: "Основной зал",
    time: "19:30",
    description:
      "Места списываются только в момент подтверждения и не держатся, пока вы заполняете данные.",
  },
  {
    id: "late" as const,
    label: "Поздний сеанс",
    time: "21:30",
    description:
      "Последние места. К моменту подтверждения их уже занимают — касса отклонит заказ.",
  },
] as const;

export function getSession(id: SessionId) {
  return sessions.find((session) => session.id === id) ?? sessions[0];
}
