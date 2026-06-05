"""
Busqueda global federada sobre entidades consultables actuales.
"""
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Global Search"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


def _result(entity: str, title: str, subtitle: str, path: str, icon: str, meta: dict | None = None, domain: str | None = None, destination_label: str | None = None) -> dict:
    return {
        "entity": entity,
        "domain": domain or entity,
        "title": title,
        "subtitle": subtitle,
        "path": path,
        "destination_label": destination_label or path,
        "icon": icon,
        "meta": meta or {},
    }


def _deep_path(base_path: str, **params) -> str:
    clean_params = {key: value for key, value in params.items() if value not in (None, "")}
    return f"{base_path}?{urlencode(clean_params)}" if clean_params else base_path


@router.get("/", response_class=JSONResponse)
async def global_search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=80),
    limit: int = Query(8, ge=3, le=100),
    user: dict = Depends(get_current_user),
):
    term = f"%{q.strip()}%"
    results = []
    async with db_manager.get_async_session() as session:
        if _has_any_permission(user, ["PRODUCTS_ACCESS", "PRODUCTS_MANAGE"]):
            rows = await session.execute(
                text(
                    """
                    SELECT p.id AS product_id, p.product_code, p.product_name,
                           pv.id AS variant_id, pv.variant_sku, pv.variant_name,
                           c.category_name, pb.brand_name, pm.model_name
                    FROM products p
                    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
                    LEFT JOIN categories c ON c.id = p.category_id
                    LEFT JOIN product_brands pb ON pb.id = p.brand_id
                    LEFT JOIN product_models pm ON pm.id = p.product_model_id
                    WHERE p.deleted_at IS NULL
                      AND (
                        p.product_code LIKE :term OR p.product_name LIKE :term
                        OR pv.variant_sku LIKE :term OR pv.variant_name LIKE :term
                        OR c.category_name LIKE :term OR pb.brand_name LIKE :term OR pm.model_name LIKE :term
                      )
                    ORDER BY p.product_name, pv.variant_sku
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                is_variant = row["variant_id"] is not None
                path = _deep_path(
                    "/products",
                    tab="variants" if is_variant else "products",
                    search=row["variant_sku"] if is_variant else row["product_code"],
                    open="edit",
                    id=row["variant_id"] if is_variant else row["product_id"],
                )
                results.append(_result(
                    "SKU" if is_variant else "Producto",
                    row["variant_name"] or row["product_name"],
                    " / ".join([value for value in [row["product_code"], row["variant_sku"], row["brand_name"], row["model_name"]] if value]),
                    path,
                    "Package",
                    {"category": row["category_name"]},
                    "Inventario",
                    "Inventario >> Catalogo de productos",
                ))

        if _has_any_permission(user, ["FOUNDATION_MAINTAINERS_ACCESS", "FOUNDATION_MAINTAINERS_MANAGE"]):
            rows = await session.execute(
                text(
                    """
                    SELECT id, customer_code, legal_name, commercial_name, tax_id, email
                    FROM customers
                    WHERE deleted_at IS NULL
                      AND (customer_code LIKE :term OR legal_name LIKE :term OR commercial_name LIKE :term OR tax_id LIKE :term OR email LIKE :term)
                    ORDER BY legal_name
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Cliente", row["commercial_name"] or row["legal_name"], f"{row['customer_code']} / {row['tax_id']}", f"/customers/edit/{row['customer_code']}", "Users", {"email": row["email"]}, "Clientes", "Clientes >> Listado de clientes"))

            rows = await session.execute(
                text(
                    """
                    SELECT id, supplier_code, legal_name, commercial_name, tax_id, email
                    FROM suppliers
                    WHERE deleted_at IS NULL
                      AND (supplier_code LIKE :term OR legal_name LIKE :term OR commercial_name LIKE :term OR tax_id LIKE :term OR email LIKE :term)
                    ORDER BY legal_name
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Proveedor", row["commercial_name"] or row["legal_name"], f"{row['supplier_code']} / {row['tax_id'] or 'Sin RUT'}", _deep_path("/suppliers", tab="suppliers", search=row["supplier_code"], open="edit", id=row["id"]), "Truck", {"email": row["email"]}, "Proveedores", "Proveedores >> Listado de proveedores"))

            rows = await session.execute(
                text(
                    """
                    SELECT id, bank_code, bank_name, country FROM banks
                    WHERE deleted_at IS NULL AND (bank_code LIKE :term OR bank_name LIKE :term)
                    ORDER BY bank_name LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Banco", row["bank_name"], f"{row['bank_code']} / {row['country']}", _deep_path("/finance/banking", tab="banks", search=row["bank_code"], open="edit", id=row["id"]), "Building2", domain="Finanzas", destination_label="Finanzas >> Bancos y cuentas bancarias"))

            rows = await session.execute(
                text(
                    """
                    SELECT id, currency_code, currency_name, currency_symbol FROM currencies
                    WHERE deleted_at IS NULL AND (currency_code LIKE :term OR currency_name LIKE :term OR currency_symbol LIKE :term)
                    ORDER BY currency_code LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Moneda", row["currency_name"], f"{row['currency_code']} / {row['currency_symbol']}", _deep_path("/finance/currencies", tab="currencies", search=row["currency_code"], open="edit", id=row["id"]), "CircleDollarSign", domain="Finanzas", destination_label="Finanzas >> Monedas y tipos de cambio"))

        if _has_any_permission(user, ["USER_READ", "USER_MANAGER"]):
            rows = await session.execute(
                text(
                    """
                    SELECT id, username, email, first_name, last_name, phone, is_active
                    FROM users
                    WHERE deleted_at IS NULL
                      AND (
                        username LIKE :term OR email LIKE :term
                        OR first_name LIKE :term OR last_name LIKE :term
                        OR CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE :term
                        OR phone LIKE :term
                      )
                    ORDER BY first_name, last_name, username
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                full_name = " ".join([value for value in [row["first_name"], row["last_name"]] if value]).strip()
                title = full_name or row["username"]
                subtitle = " / ".join([value for value in [row["username"], row["email"], row["phone"]] if value])
                results.append(_result("Usuario", title, subtitle, _deep_path("/admin/users", search=row["username"], open="edit", id=row["id"]), "Users", {"is_active": row["is_active"]}, "Administracion", "Administracion >> Administracion de usuarios"))

        if _has_any_permission(user, ["WAREHOUSE_READ", "WAREHOUSE_MANAGER", "WAREHOUSES_ACCESS"]):
            rows = await session.execute(
                text(
                    """
                    SELECT id, warehouse_code, warehouse_name, warehouse_type, city, is_active
                    FROM warehouses
                    WHERE deleted_at IS NULL
                      AND (warehouse_code LIKE :term OR warehouse_name LIKE :term OR city LIKE :term)
                    ORDER BY warehouse_name
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Bodega", row["warehouse_name"], f"{row['warehouse_code']} / {row['warehouse_type']} / {row['city'] or 'Sin ciudad'}", _deep_path("/admin/warehouses", search=row["warehouse_code"], open="edit", id=row["id"]), "Store", {"is_active": row["is_active"]}, "Administracion", "Administracion >> Administracion de bodegas"))

        if _has_any_permission(user, ["PRICE_LISTS_ACCESS", "PRICE_LISTS_MANAGE"]):
            rows = await session.execute(
                text(
                    """
                    SELECT id, price_list_code, price_list_name, currency_code
                    FROM price_lists
                    WHERE deleted_at IS NULL
                      AND (price_list_code LIKE :term OR price_list_name LIKE :term OR currency_code LIKE :term)
                    ORDER BY price_list_name
                    LIMIT :limit
                    """
                ),
                {"term": term, "limit": limit},
            )
            for row in rows.mappings().all():
                results.append(_result("Lista de precios", row["price_list_name"], f"{row['price_list_code']} / {row['currency_code']}", _deep_path("/price-lists", tab="lists", search=row["price_list_code"], open="edit", id=row["id"]), "BadgeDollarSign", domain="Inventario", destination_label="Inventario >> Listas de precios"))

    return ResponseManager.success(data=results[: limit * 6], request=request)
