from app.cashier import CheckoutService, Inventory
from app.rules import build_quote, normalize_order, normalize_request, ticket_of

ADULT = {"name": "Анна Ковалева", "age": 34}
CHILD = {"name": "Лев Ковалев", "age": 8}


def request(participants, **extra):
    body = {"sessionId": "main", "email": "anna@example.com", "participants": participants}
    body.update(extra)
    return body


def test_child_and_full_prices():
    assert ticket_of(13) == {"kind": "child", "price": 1000, "label": "Детский билет"}
    assert ticket_of(14)["kind"] == "full"
    assert ticket_of(14)["price"] == 2000
    assert ticket_of(17)["kind"] == "full"
    assert ticket_of(18)["kind"] == "full"


def test_child_needs_adult_and_teen_does_not_count():
    alone = normalize_order("a@example.com", [{"name": "Лев", "age": 13}])
    assert alone["ok"] is False
    assert any(error["path"] == "companion" for error in alone["errors"])

    with_teen = normalize_order(
        "a@example.com",
        [{"name": "Лев", "age": 10}, {"name": "Ира", "age": 16}],
    )
    assert with_teen["ok"] is False
    message = next(error["message"] for error in with_teen["errors"] if error["path"] == "companion")
    assert "не сопровождает" in message

    with_adult = normalize_order("a@example.com", [ADULT, CHILD])
    assert with_adult["ok"] is True
    assert build_quote(with_adult["participants"])["total"] == 3000


def test_fourteen_alone_and_infant_with_adult():
    teen = normalize_order("a@example.com", [{"name": "Нина", "age": 14}])
    assert teen["ok"] is True
    assert build_quote(teen["participants"])["total"] == 2000

    infant = normalize_order(
        "a@example.com",
        [{"name": "Анна", "age": 30}, {"name": "Марк", "age": 0}],
    )
    assert infant["ok"] is True
    assert build_quote(infant["participants"])["total"] == 3000


def test_party_size_and_four_adults():
    four = normalize_request(
        request(
            [
                {"name": "Анна", "age": 30},
                {"name": "Борис", "age": 31},
                {"name": "Вера", "age": 32},
                {"name": "Глеб", "age": 33},
            ]
        )
    )
    assert four["ok"] is True
    assert build_quote(four["participants"])["total"] == 8000

    five = normalize_request(
        request(
            [
                {"name": "Анна", "age": 30},
                {"name": "Борис", "age": 31},
                {"name": "Вера", "age": 32},
                {"name": "Глеб", "age": 33},
                {"name": "Дана", "age": 34},
            ]
        )
    )
    assert five["ok"] is False
    assert normalize_order("a@example.com", [])["ok"] is False


def test_name_and_email_are_normalized():
    broken = normalize_order("не email", [{"name": " А ", "age": ""}])
    assert [error["path"] for error in broken["errors"]] == [
        "participants.0.name",
        "participants.0.age",
        "email",
    ]

    named = normalize_order("  Anna@Example.com  ", [{"name": "  Анна-Мария   Лен  ", "age": "34"}])
    assert named["ok"] is True
    assert named["participants"][0]["name"] == "Анна-Мария Лен"
    assert named["participants"][0]["age"] == 34
    assert named["email"] == "Anna@Example.com"


def test_late_session_sells_out_without_touching_the_main_hall():
    service = CheckoutService(Inventory(8))
    body = request([ADULT, CHILD], sessionId="late")

    preview = service.preview(body)
    assert preview["status"] == 200
    assert preview["body"]["seatsBefore"] == 3
    assert preview["body"]["seatsLeft"] == 0
    assert preview["body"]["availabilityChanged"] is True
    assert preview["body"]["enough"] is False
    assert preview["body"]["quote"]["total"] == 3000
    assert "seat" not in preview["body"]["quote"]["lines"][0]
    assert service.availability()["mainSeatsLeft"] == 8

    confirm = service.confirm(body)
    assert confirm["status"] == 409
    assert len(confirm["body"]["quote"]["lines"]) == 2
    assert service.availability()["mainSeatsLeft"] == 8


def test_main_hall_assigns_seats_only_after_confirm():
    service = CheckoutService(Inventory(2))
    body = request([ADULT, {"name": "Нина", "age": 14}])

    assert service.preview(body)["body"]["enough"] is True
    assert service.availability()["mainSeatsLeft"] == 2

    first = service.confirm(body)
    assert first["status"] == 201
    assert first["body"]["id"] == "ЛЕН-2401"
    assert [line["seat"] for line in first["body"]["lines"]] == ["Место 1", "Место 2"]
    assert first["body"]["total"] == 4000
    assert first["body"]["seatsLeft"] == 0

    second = service.confirm(request([ADULT]))
    assert second["status"] == 409
    assert second["body"]["seatsLeft"] == 0

    service.reset()
    assert service.availability()["mainSeatsLeft"] == 2
    third = service.confirm(request([ADULT]))
    assert third["status"] == 201
    assert third["body"]["lines"][0]["seat"] == "Место 1"


def test_invalid_order_does_not_spend_seats():
    service = CheckoutService(Inventory(4))
    assert service.confirm(request([{"name": "Лев", "age": 8}]))["status"] == 400
    assert service.confirm(None)["status"] == 400
    assert service.availability()["mainSeatsLeft"] == 4
