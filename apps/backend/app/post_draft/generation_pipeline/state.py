from dataclasses import dataclass, field


@dataclass
class OptionState:
  text: str
  angle_label: str
  artifact_issues: list[str] = field(default_factory=list)
  voice_issues: list[str] = field(default_factory=list)
  status: str = "pending"
  attempt: int = 0
