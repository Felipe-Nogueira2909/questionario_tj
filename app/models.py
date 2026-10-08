from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Vistoria(Base):
    __tablename__ = "vistorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unidade_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    unidade_nome: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    data_vistoria: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="Rascunho", index=True)
    respostas: Mapped[dict] = mapped_column(JSON, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

