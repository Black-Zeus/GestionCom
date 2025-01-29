from utils.redisConfig import redis_client

def get_user_secret(user_id: int):
    """Obtiene el secreto JWT de un usuario desde Redis o la base de datos si no está en caché."""
    cache_key = f"user_secret:{user_id}"
    secret = redis_client.get(cache_key)

    if secret is None:
        from models.user import User  # Importación diferida para evitar dependencias circulares
        from sqlalchemy.orm import Session
        from utils.dbConfig import SessionLocal

        db: Session = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()

        if user and user.secretJwt:
            secret = user.secretJwt
            redis_client.setex(cache_key, 3600, secret)  # Guardar en caché con TTL de 1 hora
        else:
            raise ValueError("El usuario no tiene un secreto válido.")
    
    return secret

def store_user_secret(user_id: int, secret: str):
    """Almacena el secreto JWT del usuario en Redis."""
    cache_key = f"user_secret:{user_id}"
    redis_client.setex(cache_key, 3600, secret)  # TTL de 1 hora

def delete_user_secret(user_id: int):
    """Elimina el secreto JWT del usuario en Redis."""
    cache_key = f"user_secret:{user_id}"
    redis_client.delete(cache_key)
