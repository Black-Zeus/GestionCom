"""
Emision de alertas para lotes vencidos o proximos a vencer.
"""
from __future__ import annotations

from sqlalchemy import text


async def emit_expiring_lot_alerts(session, days: int = 30, include_missing: bool = True, limit: int = 500) -> dict:
    notification_type = await session.execute(
        text("SELECT id FROM notification_types WHERE type_code = 'INVENTORY_ALERT' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1")
    )
    notification_type_id = notification_type.scalar_one_or_none()
    if not notification_type_id:
        return {"lots_considered": 0, "recipients": 0, "notifications_created": 0, "skipped_reason": "missing_inventory_alert_type"}

    recipients = await session.execute(
        text(
            """
            SELECT DISTINCT u.id
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE u.is_active = TRUE
              AND u.deleted_at IS NULL
              AND p.permission_code = 'NOTIFICATIONS_ACCESS'
              AND EXISTS (
                SELECT 1
                FROM user_roles iur
                JOIN role_permissions irp ON irp.role_id = iur.role_id
                JOIN permissions ip ON ip.id = irp.permission_id
                WHERE iur.user_id = u.id
                  AND ip.permission_code IN ('STOCK_VIEW', 'WAREHOUSE_INVENTORY_VIEW', 'STOCK_MOVEMENTS_ACCESS', 'INVENTORY_MAINTAINERS_ACCESS')
              )
            """
        )
    )
    recipient_ids = [int(row["id"]) for row in recipients.mappings().all()]
    if not recipient_ids:
        return {"lots_considered": 0, "recipients": 0, "notifications_created": 0, "skipped_reason": "no_recipients"}

    missing_clause = "OR (p.has_expiry_date = TRUE AND s.expiry_date IS NULL)" if include_missing else ""
    lots_result = await session.execute(
        text(
            "SELECT s.id AS stock_id, p.product_name, pv.variant_name, w.warehouse_name, "
            "s.batch_lot_number, s.expiry_date, s.current_quantity, "
            "CASE "
            "WHEN s.expiry_date IS NULL THEN 'MISSING' "
            "WHEN s.expiry_date < CURRENT_DATE THEN 'EXPIRED' "
            "WHEN DATEDIFF(s.expiry_date, CURRENT_DATE) <= 7 THEN 'CRITICAL' "
            "WHEN DATEDIFF(s.expiry_date, CURRENT_DATE) <= 30 THEN 'WARNING' "
            "ELSE 'OK' END AS expiry_status, "
            "CASE WHEN s.expiry_date IS NULL THEN NULL ELSE DATEDIFF(s.expiry_date, CURRENT_DATE) END AS days_to_expiry "
            "FROM stock s "
            "JOIN product_variants pv ON pv.id = s.product_variant_id "
            "JOIN products p ON p.id = pv.product_id "
            "JOIN warehouses w ON w.id = s.warehouse_id "
            "WHERE p.has_expiry_date = TRUE "
            "AND s.current_quantity > 0 "
            "AND (s.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL :days DAY) "
            f"{missing_clause}) "
            "AND p.deleted_at IS NULL AND pv.deleted_at IS NULL AND w.deleted_at IS NULL "
            "ORDER BY CASE WHEN s.expiry_date IS NULL THEN 0 ELSE 1 END, s.expiry_date ASC, p.product_name LIMIT :limit"
        ),
        {"days": days, "limit": limit},
    )
    lots = [dict(row) for row in lots_result.mappings().all()]
    created = 0
    status_labels = {"MISSING": "sin fecha de vencimiento", "EXPIRED": "vencido", "CRITICAL": "critico", "WARNING": "proximo a vencer", "OK": "vigente"}
    priorities = {"MISSING": "HIGH", "EXPIRED": "URGENT", "CRITICAL": "HIGH", "WARNING": "NORMAL", "OK": "LOW"}
    for lot in lots:
        lot_label = lot.get("batch_lot_number") or "sin lote"
        status = lot.get("expiry_status") or "WARNING"
        title = f"Lote {status_labels.get(status, 'por revisar')}: {lot['variant_name']}"
        message = (
            f"{lot['product_name']} / {lot['variant_name']} en {lot['warehouse_name']} "
            f"tiene stock {lot['current_quantity']} con lote {lot_label}"
        )
        if lot.get("expiry_date"):
            message += f" y vencimiento {lot['expiry_date']} ({lot.get('days_to_expiry')} dias)."
        else:
            message += " y requiere fecha de vencimiento."
        for recipient_id in recipient_ids:
            result = await session.execute(
                text(
                    """
                    INSERT INTO user_notifications (
                      notification_type_id, user_id, title, message, action_url, action_label,
                      source_table, source_id, source_label, priority
                    )
                    SELECT :notification_type_id, :user_id, :title, :message, :action_url, 'Revisar tracking',
                      'stock', :source_id, 'Inventario', :priority
                    WHERE NOT EXISTS (
                      SELECT 1
                      FROM user_notifications
                      WHERE user_id = :user_id
                        AND notification_type_id = :notification_type_id
                        AND source_table = 'stock'
                        AND source_id = :source_id
                        AND deleted_at IS NULL
                        AND delivered_at >= CURRENT_DATE
                    )
                    """
                ),
                {
                    "notification_type_id": notification_type_id,
                    "user_id": recipient_id,
                    "title": title,
                    "message": message,
                    "action_url": "/stock/tracking-reports",
                    "source_id": lot["stock_id"],
                    "priority": priorities.get(status, "NORMAL"),
                },
            )
            created += result.rowcount or 0
    return {"lots_considered": len(lots), "recipients": len(recipient_ids), "notifications_created": created}

