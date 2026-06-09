from datetime import date

from sqlalchemy import text


def normalize_batch_lot(value: str | None) -> str | None:
    cleaned = str(value or "").strip()
    return cleaned or None


async def get_variant_tracking(session, product_variant_id: int) -> dict:
    result = await session.execute(
        text(
            "SELECT pv.id AS product_variant_id, pv.product_id, p.product_name, "
            "p.has_location_tracking, p.has_batch_control, p.has_expiry_date, p.has_serial_numbers "
            "FROM product_variants pv "
            "JOIN products p ON p.id = pv.product_id "
            "WHERE pv.id = :product_variant_id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
        ),
        {"product_variant_id": product_variant_id},
    )
    row = result.mappings().first()
    if not row:
        raise ValueError("SKU / variacion no encontrada")
    return {
        "product_variant_id": int(row["product_variant_id"]),
        "product_id": int(row["product_id"]),
        "product_name": row["product_name"],
        "has_location_tracking": bool(row["has_location_tracking"]),
        "has_batch_control": bool(row["has_batch_control"]),
        "has_expiry_date": bool(row["has_expiry_date"]),
        "has_serial_numbers": bool(row["has_serial_numbers"]),
    }


async def validate_tracking_dimensions(
    session,
    product_variant_id: int,
    warehouse_zone_location_id: int | None,
    batch_lot_number: str | None,
    expiry_date: date | None,
) -> dict:
    tracking = await get_variant_tracking(session, product_variant_id)
    batch_lot_number = normalize_batch_lot(batch_lot_number)

    if tracking["has_location_tracking"] and not warehouse_zone_location_id:
        raise ValueError("El producto controla ubicacion; selecciona una ubicacion interna")
    if tracking["has_batch_control"] and not batch_lot_number:
        raise ValueError("El producto controla lotes; indica el lote")
    if tracking["has_expiry_date"]:
        if not batch_lot_number:
            raise ValueError("El producto controla vencimiento; indica el lote")
        if not expiry_date:
            raise ValueError("El producto controla vencimiento; indica la fecha de vencimiento")

    return {
        **tracking,
        "batch_lot_number": batch_lot_number,
        "expiry_date": expiry_date,
    }
