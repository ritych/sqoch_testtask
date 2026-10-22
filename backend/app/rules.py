import re
from typing import Any

# Полный билет — с 14 лет включительно. Младше — детский.
# Сопровождающий — отдельно: от 18 лет. Участник 14–17 лет платит полную цену
# и не может провести ребёнка.
CHILD_AGE_BELOW = 14
COMPANION_AGE = 18
FULL_PRICE = 2000
CHILD_PRICE = 1000
MIN_PARTICIPANTS = 1
MAX_PARTICIPANTS = 4
MIN_AGE = 0
MAX_AGE = 120
MAIN_HALL_CAPACITY = 8
LATE_SEATS_SHOWN = 3

_LETTER = r"[^\W\d_]"
_NAME_RE = re.compile(rf"^{_LETTER}(?:{_LETTER}|[\s.'’\-])*{_LETTER}$", re.UNICODE)
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
_AGE_RE = re.compile(r"^\d{1,3}$")


def ticket_of(age: int) -> dict[str, Any]:
    kind = "child" if age < CHILD_AGE_BELOW else "full"
    return {
        "kind": kind,
        "price": CHILD_PRICE if kind == "child" else FULL_PRICE,
        "label": "Детский билет" if kind == "child" else "Полный билет",
    }


def build_quote(participants: list[dict[str, Any]]) -> dict[str, Any]:
    lines = []
    for person in participants:
        ticket = ticket_of(person["age"])
        lines.append(
            {
                "name": person["name"],
                "age": person["age"],
                "kind": ticket["kind"],
                "price": ticket["price"],
            }
        )
    return {"lines": lines, "total": sum(line["price"] for line in lines)}


def parse_age(value: Any) -> tuple[bool, bool | int]:
    """Возвращает (ok, age) либо (False, empty)."""
    if isinstance(value, bool):
        return False, False
    if isinstance(value, int):
        if value < MIN_AGE or value > MAX_AGE:
            return False, False
        return True, value
    if not isinstance(value, str):
        return False, False
    trimmed = value.strip()
    if not trimmed:
        return False, True
    if not _AGE_RE.fullmatch(trimmed):
        return False, False
    age = int(trimmed)
    if age > MAX_AGE:
        return False, False
    return True, age


def _is_record(value: Any) -> bool:
    return isinstance(value, dict)


def _collapse_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def _name_error(value: str) -> str | None:
    name = _collapse_name(value)
    if not name:
        return "Укажите имя"
    if len(name) > 80 or not _NAME_RE.fullmatch(name):
        return "Имя — от 2 букв, можно пробел и дефис"
    return None


def _email_error(value: str) -> str | None:
    email = value.strip()
    if not email:
        return "Укажите email — он один на весь заказ"
    if len(email) > 120 or not _EMAIL_RE.fullmatch(email):
        return "Похоже, в email ошибка"
    return None


def _companion_message(ages: list[int]) -> str | None:
    has_child = any(age < CHILD_AGE_BELOW for age in ages)
    has_companion = any(age >= COMPANION_AGE for age in ages)
    if not has_child or has_companion:
        return None
    has_teen = any(CHILD_AGE_BELOW <= age < COMPANION_AGE for age in ages)
    if has_teen:
        return (
            f"Ребёнок младше {CHILD_AGE_BELOW} лет может быть в заказе только вместе "
            f"с участником от {COMPANION_AGE} лет. Билет с {CHILD_AGE_BELOW} до {COMPANION_AGE - 1} лет — "
            "полный, но такой участник не сопровождает ребёнка."
        )
    return (
        f"Ребёнок младше {CHILD_AGE_BELOW} лет может попасть на мероприятие только вместе "
        f"с участником от {COMPANION_AGE} лет в этом же заказе."
    )


def normalize_order(email: str, participants: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    if len(participants) < MIN_PARTICIPANTS or len(participants) > MAX_PARTICIPANTS:
        errors.append(
            {
                "path": "participants",
                "message": f"В одном заказе от {MIN_PARTICIPANTS} до {MAX_PARTICIPANTS} участников",
            }
        )

    people: list[dict[str, Any]] = []
    ages_complete = MIN_PARTICIPANTS <= len(participants) <= MAX_PARTICIPANTS

    for index, person in enumerate(participants):
        if index >= MAX_PARTICIPANTS:
            break
        name_message = _name_error(str(person.get("name", "")))
        if name_message:
            errors.append({"path": f"participants.{index}.name", "message": name_message})

        ok, parsed = parse_age(person.get("age", ""))
        if not ok:
            ages_complete = False
            errors.append(
                {
                    "path": f"participants.{index}.age",
                    "message": "Укажите возраст" if parsed else f"Возраст — целое число от {MIN_AGE} до {MAX_AGE}",
                }
            )
            continue
        if not name_message:
            people.append({"name": _collapse_name(str(person["name"])), "age": parsed})

    if ages_complete:
        parsed_ages = [parse_age(person.get("age", "")) for person in participants[:MAX_PARTICIPANTS]]
        if all(item[0] for item in parsed_ages):
            message = _companion_message([int(item[1]) for item in parsed_ages])
            if message:
                errors.append({"path": "companion", "message": message})

    email_message = _email_error(email)
    if email_message:
        errors.append({"path": "email", "message": email_message})

    if errors or len(people) != min(len(participants), MAX_PARTICIPANTS):
        return {"ok": False, "errors": errors}

    return {"ok": True, "email": email.strip(), "participants": people}


def _coerce_participant(raw: Any) -> dict[str, Any]:
    if not _is_record(raw):
        return {"name": "", "age": ""}
    name = raw.get("name") if isinstance(raw.get("name"), str) else ""
    age = raw.get("age")
    if isinstance(age, bool) or not isinstance(age, (int, str)):
        age = ""
    return {"name": name, "age": age}


def normalize_request(body: Any) -> dict[str, Any]:
    if not _is_record(body):
        return {"ok": False, "errors": [{"path": "body", "message": "Некорректный запрос"}]}

    errors: list[dict[str, str]] = []
    session_id = body.get("sessionId") if body.get("sessionId") in ("main", "late") else None
    if session_id is None:
        errors.append({"path": "sessionId", "message": "Выберите сеанс"})

    raw_participants = body.get("participants")
    participants_are_list = isinstance(raw_participants, list)
    if not participants_are_list:
        errors.append({"path": "participants", "message": "Нужен список участников"})

    email = body.get("email")
    domain = normalize_order(
        email if isinstance(email, str) else "",
        [_coerce_participant(item) for item in raw_participants] if participants_are_list else [],
    )

    if not domain["ok"]:
        for error in domain["errors"]:
            if not participants_are_list and error["path"] == "participants":
                continue
            if not isinstance(email, str) and error["path"] == "email":
                continue
            errors.append(error)

    if not isinstance(email, str):
        errors.append({"path": "email", "message": "Укажите email — он один на весь заказ"})

    if errors or not domain["ok"] or session_id is None:
        return {"ok": False, "errors": errors or [{"path": "body", "message": "Некорректный запрос"}]}

    return {
        "ok": True,
        "sessionId": session_id,
        "email": domain["email"],
        "participants": domain["participants"],
    }
