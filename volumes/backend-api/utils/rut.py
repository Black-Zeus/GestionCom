import re


def normalize_chilean_rut(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9kK]", "", str(value)).upper()
    if len(cleaned) < 2:
        return cleaned
    return f"{cleaned[:-1]}-{cleaned[-1]}"


def is_valid_chilean_rut(value: str | None) -> bool:
    cleaned = re.sub(r"[^0-9kK]", "", str(value or "")).upper()
    if len(cleaned) < 2:
        return False

    body = cleaned[:-1]
    expected_digit = cleaned[-1]
    if not body.isdigit():
        return False

    total = 0
    multiplier = 2
    for digit in reversed(body):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1

    remainder = 11 - (total % 11)
    calculated_digit = "0" if remainder == 11 else "K" if remainder == 10 else str(remainder)
    return calculated_digit == expected_digit


def validate_and_normalize_chilean_rut(value: str | None) -> str | None:
    if value in (None, ""):
        return None
    if not is_valid_chilean_rut(value):
        raise ValueError("Ingresa un RUT valido")
    return normalize_chilean_rut(value)
