"""
Generacion centralizada de codigos internos para mantenedores.
"""
from sqlalchemy import func, select


async def generate_sequential_code(session, model, field_name: str, prefix: str, width: int = 4) -> str:
    """Genera PREFIX_0001 evitando colisiones con registros activos o eliminados."""
    column = getattr(model, field_name)
    pattern = f"{prefix}_%"
    result = await session.execute(select(column).where(column.like(pattern)).order_by(column.desc()).limit(1))
    last_code = result.scalar_one_or_none()

    next_number = 1
    if last_code:
        try:
            next_number = int(str(last_code).rsplit("_", 1)[1]) + 1
        except (IndexError, ValueError):
            count_result = await session.execute(select(func.count()).select_from(model).where(column.like(pattern)))
            next_number = int(count_result.scalar() or 0) + 1

    while True:
        candidate = f"{prefix}_{next_number:0{width}d}"
        exists_result = await session.execute(select(column).where(column == candidate).limit(1))
        if not exists_result.scalar_one_or_none():
            return candidate
        next_number += 1
