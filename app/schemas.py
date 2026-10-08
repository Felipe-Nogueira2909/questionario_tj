from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ShortText = str | None
ChoiceYesNo = Literal["Sim", "Não"] | None
ChoiceYesNoNA = Literal["Sim", "Não", "N/A"] | None


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Identificacao(StrictModel):
    data_vistoria: date | None = None
    horario_inicio: time | None = None
    horario_termino: time | None = None
    equipe_ipq: ShortText = Field(default=None, max_length=300)
    responsavel_local: ShortText = Field(default=None, max_length=180)


class PontoCamera(StrictModel):
    local_ambiente: ShortText = Field(default=None, max_length=200)
    tipo: ShortText = Field(default=None, max_length=100)
    tombamento: ShortText = Field(default=None, max_length=100)
    altura_aproximada: float | None = Field(default=None, ge=0, le=100)
    infra: bool = False
    cabo: bool = False
    energia: bool = False
    observacoes: ShortText = Field(default=None, max_length=1000)


class InfraItem(StrictModel):
    item: str = Field(max_length=100)
    pvc_preto: bool = False
    galvanizado: bool = False
    pvc_branco: bool = False


class Infraestrutura(StrictModel):
    padrao_pvc_preto: bool = False
    padrao_galvanizada: bool = False
    padrao_pvc_branco: bool = False
    itens: list[InfraItem] = Field(default_factory=list, max_length=7)


class Verificacao(StrictModel):
    item: str = Field(max_length=180)
    resposta: ShortText = Field(default=None, max_length=50)
    observacao: ShortText = Field(default=None, max_length=1000)


class Equipamento(StrictModel):
    item: str = Field(max_length=100)
    existente: ChoiceYesNo = None
    quantidade_necessaria: int | None = Field(default=None, ge=0, le=99999)
    condicao_observacao: ShortText = Field(default=None, max_length=1000)
    fixacao_adequada: ChoiceYesNo = None
    necessita_adequacao: ChoiceYesNo = None


class Pendencia(StrictModel):
    descricao: ShortText = Field(default=None, max_length=1500)
    local: ShortText = Field(default=None, max_length=300)
    impacto: ShortText = Field(default=None, max_length=1000)
    solucao_necessaria: ShortText = Field(default=None, max_length=1500)


class Solucao(StrictModel):
    descricao: ShortText = Field(default=None, max_length=1500)
    responsavel_dependencia: ShortText = Field(default=None, max_length=500)
    prazo_observacao: ShortText = Field(default=None, max_length=1000)


class Responsavel(StrictModel):
    nome: ShortText = Field(default=None, max_length=180)
    cargo: ShortText = Field(default=None, max_length=180)
    assinatura: ShortText = Field(default=None, max_length=300)
    data: date | None = None


class Responsaveis(StrictModel):
    ipq: Responsavel = Field(default_factory=Responsavel)
    tjce: Responsavel = Field(default_factory=Responsavel)


class Conclusao(StrictModel):
    situacao: Literal[
        "APTO PARA EXECUÇÃO",
        "APTO COM RESSALVAS",
        "NECESSITA ADEQUAÇÃO",
        "NECESSITA NOVA VISTORIA",
    ] | None = None
    observacoes_finais: ShortText = Field(default=None, max_length=4000)


class Respostas(StrictModel):
    identificacao: Identificacao = Field(default_factory=Identificacao)
    pontos_camera: list[PontoCamera] = Field(default_factory=list, max_length=500)
    infraestrutura: Infraestrutura = Field(default_factory=Infraestrutura)
    cabeamento: list[Verificacao] = Field(default_factory=list, max_length=6)
    equipamentos: list[Equipamento] = Field(default_factory=list, max_length=7)
    condicoes_rack: list[Verificacao] = Field(default_factory=list, max_length=4)
    infraestrutura_eletrica: list[Verificacao] = Field(default_factory=list, max_length=6)
    certificacao: list[Verificacao] = Field(default_factory=list, max_length=5)
    pendencias: list[Pendencia] = Field(default_factory=list, max_length=200)
    solucoes: list[Solucao] = Field(default_factory=list, max_length=200)
    conclusao: Conclusao = Field(default_factory=Conclusao)
    responsaveis: Responsaveis = Field(default_factory=Responsaveis)


class VistoriaPayload(StrictModel):
    unidade_id: str = Field(min_length=1, max_length=16)
    status: Literal["Rascunho", "Concluída"] = "Rascunho"
    respostas: Respostas

    @model_validator(mode="after")
    def validate_completed(self):
        if self.status == "Concluída" and not self.respostas.conclusao.situacao:
            raise ValueError("A conclusão da vistoria é obrigatória ao salvar como concluída.")
        return self


class VistoriaOut(StrictModel):
    id: int
    unidade_id: str
    unidade_nome: str
    data_vistoria: date | None
    status: str
    respostas: dict
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class VistoriaResumo(StrictModel):
    id: int
    unidade_id: str
    unidade_nome: str
    data_vistoria: date | None
    equipe_ipq: str | None
    situacao: str | None
    status: str
    atualizado_em: datetime

