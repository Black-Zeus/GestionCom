#volumes\backend-api\models\branch.py
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship

from utils.dbConfig import Base

from datetime import datetime


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)  # ID único de la sucursal
    name = Column(String(150), nullable=False)  # Nombre de la sucursal
    address = Column(String(255), nullable=False)  # Dirección de la sucursal
    statusId = Column(Integer, ForeignKey("statuses.id"), nullable=False)  # Relación con la tabla statuses
    createdAt = Column(DateTime, default=datetime.utcnow)  # Fecha de creación
    createdBy = Column(Integer, nullable=True)  # Usuario que creó el registro
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Fecha de última actualización
    updatedBy = Column(Integer, nullable=True)  # Usuario que modificó el registro
    deletedAt = Column(DateTime, nullable=True)  # Fecha de eliminación lógica
    deletedBy = Column(Integer, nullable=True)  # Usuario que eliminó el registro

    # Relación con `user_branches`
    users = relationship("UserBranch", back_populates="branch")
