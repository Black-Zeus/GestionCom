"""
Normalizacion de telefonos para persistencia.
"""
import re


def normalize_phone_for_storage(value: str | None) -> str | None:
    if value in (None, ""):
        return None

    normalized = re.sub(r"[\s-]+", "", str(value).strip())
    if not normalized:
        return None

    if not re.fullmatch(r"\+?\d+", normalized):
        raise ValueError("Formato de telefono invalido")

    if "+" in normalized and not normalized.startswith("+"):
        raise ValueError("Formato de telefono invalido")

    digits = re.sub(r"\D", "", normalized)
    if len(digits) < 8 or len(normalized) > 20:
        raise ValueError("Formato de telefono invalido")

    return normalized
