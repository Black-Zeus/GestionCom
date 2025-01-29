import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import hashlib
import os
from services.redis import get_user_secret

# Configuración de la encriptación de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de JWT
GLOBAL_SECRET = os.getenv("BACKEND_API_SECRET_KEY", "global_default_secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60

# 🔹 Funciones para manejar contraseñas
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con la almacenada en la BD."""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hashea una contraseña utilizando bcrypt."""
    return pwd_context.hash(password)

# 🔹 Función para crear JWT
def create_jwt_token(user_data: dict, user_secret: str) -> str:
    """
    Genera un JWT firmado con una combinación de `GLOBAL_SECRET` y `user_secret`.
    Incluye un `kid` para identificar qué clave se usó.
    """
    # Generar un Key ID (kid) basado en el secreto del usuario
    kid = hashlib.sha256(user_secret.encode()).hexdigest()[:16]

    # Crear la firma combinada
    combined_secret = hashlib.sha256((GLOBAL_SECRET + user_secret).encode()).hexdigest()

    # Generar el payload del JWT
    payload = {
        **user_data,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES),
        "iat": datetime.utcnow(),
    }

    # Encabezado con `kid`
    headers = {
        "alg": JWT_ALGORITHM,
        "typ": "JWT",
        "kid": kid,
    }

    # Firmar el token con el secreto combinado
    return jwt.encode(payload, combined_secret, algorithm=JWT_ALGORITHM, headers=headers)

# 🔹 Función para verificar JWT
def verify_jwt_token(token: str) -> dict:
    """
    Verifica un token JWT usando el `kid` para obtener el secreto correcto.
    """
    try:
        # Extraer el encabezado sin validar la firma
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise ValueError("El token no contiene un identificador de clave (kid).")

        # Extraer payload sin validación de firma
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified_payload.get("user_id")

        if not user_id:
            raise ValueError("Token inválido: no contiene un `user_id`.")

        # Obtener el secreto del usuario desde Redis
        user_secret = get_user_secret(user_id)

        # Crear la firma combinada para validar el token
        combined_secret = hashlib.sha256((GLOBAL_SECRET + user_secret).encode()).hexdigest()

        # Verificar la firma del token
        return jwt.decode(token, combined_secret, algorithms=[JWT_ALGORITHM])

    except jwt.ExpiredSignatureError:
        raise ValueError("El token ha expirado.")
    except jwt.InvalidTokenError:
        raise ValueError("El token es inválido.")
