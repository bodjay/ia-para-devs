from typing import TypedDict, Optional
from dataclasses import dataclass


@dataclass
class AgentInput:
    """Entrada padrão para todos os agentes."""
    query: str


@dataclass
class AgentOutput:
    """Saída padrão para todos os agentes."""
    source: str
    result: str


class Classification(TypedDict):
    """Classificação de uma consulta."""
    source: Optional[str]  # "appointments", "question", "blog" ou None
    query: str


class RouterState(TypedDict):
    """Estado do workflow router de agentes."""
    query: str
    classification: Classification
    results: list[AgentOutput]
    final_answer: str
