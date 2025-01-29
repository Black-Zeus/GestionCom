#volumes\backend-api\models\user.py
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship

from utils.dbConfig import Base

from datetime import datetime
import enum


# Enumeración para el campo gender
class GenderEnum(enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class User(Base):
    __tablename__ = "users"  # Nombre de la tabla en la base de datos

    id = Column(Integer, primary_key=True, index=True)
    firstName = Column(String(100), nullable=False)  # Nombre del usuario
    lastName = Column(String(150), nullable=False)  # Apellidos del usuario
    email = Column(String(150), unique=True, nullable=False)  # Correo electrónico único
    password = Column(String(255), nullable=False)  # Contraseña en formato hash
    secretJwt = Column(String(255), nullable=True)  # Firma local del usuario
    image = Column(String(255), nullable=True)  # Ruta o nombre del archivo de imagen del usuario
    phone = Column(String(20), nullable=True)  # Número de teléfono
    gender = Column(Enum(GenderEnum), nullable=True)  # Género (enum)
    address = Column(String(255), nullable=True)  # Dirección
    statusId = Column(Integer, ForeignKey("statuses.id"), nullable=False)  # Clave foránea a la tabla statuses
    profileId = Column(Integer, ForeignKey("profiles.id"), nullable=False)  # Clave foránea a la tabla profiles
    createdAt = Column(DateTime, default=datetime.utcnow)  # Fecha de creación
    createdBy = Column(Integer, nullable=True)  # Usuario que creó el registro
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Fecha de última modificación
    updatedBy = Column(Integer, nullable=True)  # Usuario que modificó el registro
    deletedAt = Column(DateTime, nullable=True)  # Fecha de eliminación lógica
    deletedBy = Column(Integer, nullable=True)  # Usuario que realizó la eliminación lógica

    # Relación con `user_branches`
    branches = relationship("UserBranch", back_populates="user")