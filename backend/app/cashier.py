from typing import Any

from .rules import LATE_SEATS_SHOWN, MAIN_HALL_CAPACITY, build_quote, normalize_request

EVENT = {
    "dateLabel": "12 ноября 2026",
}

SESSIONS = {
    "main": {"label": "Основной зал", "time": "19:30"},
    "late": {"label": "Поздний сеанс", "time": "21:30"},
}


class Inventory:
    """Поздний сеанс — повторяемый сценарий гонки: проверка показывает, что места были,
    а подтверждение всегда получает отказ. Основной зал списывает реальный остаток."""

    def __init__(self, capacity: int = MAIN_HALL_CAPACITY) -> None:
        self._capacity = capacity
        self.reset()

    def seats_left(self) -> int:
        return self._seats_left

    def capacity(self) -> int:
        return self._capacity

    def reset(self) -> None:
        self._seats_left = self._capacity
        self._next_seat = 1
        self._next_number = 2401

    def preview(self, order: dict[str, Any]) -> dict[str, Any]:
        session = SESSIONS[order["sessionId"]]
        late = order["sessionId"] == "late"
        before = LATE_SEATS_SHOWN if late else self._seats_left
        left = 0 if late else self._seats_left
        return {
            "sessionId": order["sessionId"],
            "sessionLabel": session["label"],
            "time": session["time"],
            "dateLabel": EVENT["dateLabel"],
            "seatsBefore": before,
            "seatsLeft": left,
            "availabilityChanged": late,
            "enough": (not late) and self._seats_left >= len(order["participants"]),
            "email": order["email"],
            "quote": build_quote(order["participants"]),
        }

    def purchase(self, order: dict[str, Any]) -> dict[str, Any]:
        needed = len(order["participants"])
        if order["sessionId"] == "late" or self._seats_left < needed:
            return {"ok": False, "body": self._sold_out(order)}

        session = SESSIONS[order["sessionId"]]
        quote = build_quote(order["participants"])
        lines = []
        for line in quote["lines"]:
            lines.append({**line, "seat": f"Место {self._next_seat}"})
            self._next_seat += 1
        self._seats_left -= needed
        order_id = f"ЛЕН-{self._next_number}"
        self._next_number += 1
        return {
            "ok": True,
            "order": {
                "id": order_id,
                "email": order["email"],
                "sessionId": order["sessionId"],
                "sessionLabel": session["label"],
                "time": session["time"],
                "dateLabel": EVENT["dateLabel"],
                "lines": lines,
                "total": quote["total"],
                "seatsLeft": self._seats_left,
            },
        }

    def _sold_out(self, order: dict[str, Any]) -> dict[str, Any]:
        session = SESSIONS[order["sessionId"]]
        late = order["sessionId"] == "late"
        return {
            "code": "SOLD_OUT",
            "sessionId": order["sessionId"],
            "sessionLabel": session["label"],
            "time": session["time"],
            "dateLabel": EVENT["dateLabel"],
            "seatsBefore": LATE_SEATS_SHOWN if late else self._seats_left,
            "seatsLeft": 0 if late else self._seats_left,
            "email": order["email"],
            "quote": build_quote(order["participants"]),
        }


class CheckoutService:
    def __init__(self, inventory: Inventory | None = None) -> None:
        self.inventory = inventory or Inventory()

    def availability(self) -> dict[str, int]:
        return {
            "mainSeatsLeft": self.inventory.seats_left(),
            "mainCapacity": self.inventory.capacity(),
            "lateSeatsShown": LATE_SEATS_SHOWN,
        }

    def reset(self) -> dict[str, int]:
        self.inventory.reset()
        return self.availability()

    def preview(self, body: Any) -> dict[str, Any]:
        parsed = normalize_request(body)
        if not parsed["ok"]:
            return {"status": 400, "body": {"code": "INVALID", "errors": parsed["errors"]}}
        return {"status": 200, "body": self.inventory.preview(parsed)}

    def confirm(self, body: Any) -> dict[str, Any]:
        parsed = normalize_request(body)
        if not parsed["ok"]:
            return {"status": 400, "body": {"code": "INVALID", "errors": parsed["errors"]}}
        result = self.inventory.purchase(parsed)
        if not result["ok"]:
            return {"status": 409, "body": result["body"]}
        return {"status": 201, "body": result["order"]}


checkout = CheckoutService()
