from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, TypedDict


@dataclass
class OptionState:
  text: str
  angle_label: str
  artifact_issues: list[str] = field(default_factory=list)
  eval_issues: list[str] = field(default_factory=list)
  status: Literal['pending', 'passed', 'failed'] = 'pending'
  attempt: int = 0


class PlanItem(TypedDict):
  angle: str
  angle_label: str
  strategy: str
  avoid: list[str]


class GraphState(TypedDict):
  product_analysis: dict
  style_fingerprint: dict
  reference_samples: list
  today_input: str | None
  research_context: str | None
  plans: list[PlanItem]
  options: list[OptionState]
  iteration: int
  threads_access_token: str | None
