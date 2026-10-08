from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog import get_units, unit_by_id
from .database import Base, engine, get_db
from .models import Vistoria
from .schemas import VistoriaOut, VistoriaPayload, VistoriaResumo
from .services.excel import build_workbook


APP_DIR = Path(__file__).resolve().parent
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Vistoria CFTV TJCE/IPQ", version="1.0.0")
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(APP_DIR / "templates" / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(APP_DIR / "static" / "favicon.svg", media_type="image/svg+xml")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/unidades")
def list_units():
    return get_units()


def visit_query(
    unidade_id: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
):
    statement = select(Vistoria)
    if unidade_id:
        statement = statement.where(Vistoria.unidade_id == unidade_id)
    if data_inicio:
        statement = statement.where(Vistoria.data_vistoria >= data_inicio)
    if data_fim:
        statement = statement.where(Vistoria.data_vistoria <= data_fim)
    return statement.order_by(Vistoria.atualizado_em.desc(), Vistoria.id.desc())


def serialize_summary(visit: Vistoria) -> VistoriaResumo:
    ident = visit.respostas.get("identificacao", {})
    conclusion = visit.respostas.get("conclusao", {})
    return VistoriaResumo(
        id=visit.id,
        unidade_id=visit.unidade_id,
        unidade_nome=visit.unidade_nome,
        data_vistoria=visit.data_vistoria,
        equipe_ipq=ident.get("equipe_ipq"),
        situacao=conclusion.get("situacao"),
        status=visit.status,
        atualizado_em=visit.atualizado_em,
    )


@app.post("/api/vistorias", response_model=VistoriaOut, status_code=201)
def create_visit(payload: VistoriaPayload, db: Session = Depends(get_db)):
    unit = unit_by_id(payload.unidade_id)
    if not unit:
        raise HTTPException(status_code=422, detail="Unidade inválida.")
    answers = payload.respostas.model_dump(mode="json")
    visit = Vistoria(
        unidade_id=unit["id"],
        unidade_nome=unit["name"],
        data_vistoria=payload.respostas.identificacao.data_vistoria,
        status=payload.status,
        respostas=answers,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@app.get("/api/vistorias", response_model=list[VistoriaResumo])
def list_visits(
    unidade_id: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    return [serialize_summary(item) for item in db.scalars(visit_query(unidade_id, data_inicio, data_fim)).all()]


@app.get("/api/vistorias/{vistoria_id}", response_model=VistoriaOut)
def get_visit(vistoria_id: int, db: Session = Depends(get_db)):
    visit = db.get(Vistoria, vistoria_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Vistoria não encontrada.")
    return visit


@app.put("/api/vistorias/{vistoria_id}", response_model=VistoriaOut)
def update_visit(vistoria_id: int, payload: VistoriaPayload, db: Session = Depends(get_db)):
    visit = db.get(Vistoria, vistoria_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Vistoria não encontrada.")
    unit = unit_by_id(payload.unidade_id)
    if not unit:
        raise HTTPException(status_code=422, detail="Unidade inválida.")
    visit.unidade_id = unit["id"]
    visit.unidade_nome = unit["name"]
    visit.data_vistoria = payload.respostas.identificacao.data_vistoria
    visit.status = payload.status
    visit.respostas = payload.respostas.model_dump(mode="json")
    db.commit()
    db.refresh(visit)
    return visit


def excel_response(visits: list[Vistoria], filename: str):
    return StreamingResponse(
        build_workbook(visits),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/vistorias/{vistoria_id}/exportar")
def export_visit(vistoria_id: int, db: Session = Depends(get_db)):
    visit = db.get(Vistoria, vistoria_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Vistoria não encontrada.")
    return excel_response([visit], f"vistoria-{vistoria_id}.xlsx")


@app.get("/api/exportar")
def export_visits(
    unidade_id: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    visits = list(db.scalars(visit_query(unidade_id, data_inicio, data_fim)).all())
    return excel_response(visits, "vistorias-cftv.xlsx")

