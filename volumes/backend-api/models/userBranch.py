#volumes\backend-api\models\userBranch.py
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship

from utils.dbConfig import Base

from datetime import datetime


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.user import User
    from models.branch import Branch  # Solo para chequeo de tipos

class UserBranch(Base):
    __tablename__ = "user_branches"

    id = Column(Integer, primary_key=True, index=True)  # ID único de la relación
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)  # Relación con la tabla users
    branchId = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)  # Relación con la tabla branches
    assignedAt = Column(DateTime, default=datetime.utcnow)  # Fecha de asignación

    # Relaciones inversas
    user = relationship("User", back_populates="branches")
    branch = relationship("Branch", back_populates="users")
