from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.userBranch import UserBranch
from models.user import User
from models.branch import Branch

from utils.security import verify_password, hash_password, create_jwt_token
from utils.dbConfig import SessionLocal
from services.redis import get_user_secret, store_user_secret

from datetime import datetime
import secrets

router = APIRouter()

# Modelos para los endpoints
class LoginRequest(BaseModel):
    email: str
    password: str

class RecoverPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    reset_token: str

# 🔹 Dependencia para manejar la conexión a la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔹 Endpoint para login
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint de autenticación de usuario y generación de JWT.
    """
    # Buscar al usuario en la base de datos
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if user.statusId != 1:
        raise HTTPException(status_code=403, detail="Usuario inactivo. Contacte al administrador.")

    if not user.secretJwt:
        raise HTTPException(status_code=400, detail="Usuario sin clave JWT asignada.")

    # Validar longitud del secreto JWT
    if not (16 <= len(user.secretJwt) <= 64):
        raise HTTPException(status_code=400, detail="Secreto JWT inválido.")

    try:
        # Intentar obtener el secreto del usuario desde Redis
        secret_jwt = get_user_secret(user.id)
    except ValueError:
        # Si no está en Redis, cargar desde la BD y guardarlo en Redis
        secret_jwt = user.secretJwt
        store_user_secret(user.id, secret_jwt)

    # Crear el token JWT con el secreto del usuario
    token = create_jwt_token(
        {
            "user_id": user.id,
            "email": user.email,
            "name": f"{user.firstName} {user.lastName}",
            "profileId": user.profileId,
        },
        secret_jwt,
    )

    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": {
            "id": user.id,
            "name": f"{user.firstName} {user.lastName}",
            "email": user.email,
            "profileId": user.profileId,
        },
    }

# 🔹 Endpoint para recuperación de contraseña
@router.post("/recover-password")
def recover_password(data: RecoverPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Simulación: Generar un token de recuperación (en producción se enviaría por correo)
    reset_token = "mock_reset_token"

    return {"message": "Instrucciones de recuperación enviadas", "reset_token": reset_token}

# 🔹 Endpoint para restablecimiento de contraseña
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar el token de restablecimiento (simulación)
    if data.reset_token != "mock_reset_token":
        raise HTTPException(status_code=400, detail="Token de restablecimiento inválido")

    # Actualizar la contraseña
    user.password = hash_password(data.new_password)
    db.commit()

    return {"message": "Contraseña restablecida con éxito"}

# 🔹 Generador de contraseñas seguras
@router.get("/genPass")
def generate_password():
    """Genera una contraseña segura y la devuelve en texto plano y cifrada."""
    plain_password = secrets.token_urlsafe(12)
    hashed_password = hash_password(plain_password)

    return {
        "plainPassword": plain_password,
        "hashedPassword": hashed_password
    }
