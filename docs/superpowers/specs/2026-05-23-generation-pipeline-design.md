# Post Draft Generation Pipeline — Design Spec

작성일: 2026-05-23

---

## 1. 현재 구조

### 파일 구성

```
app/post_draft/
  option_generation_service.py   # 생성 + retry 루프
  voice_evaluator_service.py     # 단일 evaluator
```

### 실행 흐름

```
generate 3 options (OpenAI)
    ↓
evaluate voice match (Gemini flash-lite) — 3개 배치
    ↓ 실패 있으면
regenerate failed options (OpenAI) — 1회 고정
    ↓
evaluate again (Gemini flash-lite)
    ↓
return options + evaluation_feedback
```

### 프롬프트 구조 요약

- `_build_generation_prompt`: voice + product context + today_input + hard rules
- `_build_regeneration_prompt`: voice + reference + approved options + failed options + mismatches
- voice evaluator prompt: form 일치 여부 평가, per-option matched/mismatches 반환

---

## 2. 현재 구조의 문제점

### 아키텍처 레벨

| 문제               | 설명                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| 1회 retry 고정     | 2차 평가 결과에 관계없이 무조건 반환. 테스트 5회 중 3회에서 retry 후에도 실패 잔존 |
| Feedback 축적 없음 | `initial_options → patched_options` 로컬 변수만 존재. 반복 궤적 추적 불가          |
| 평가 기준 1개      | voice match만 존재. AI 흔적, 품질 기준 없음                                        |
| 배치 평가          | 3개 옵션을 한 프롬프트에서 동시 평가 → 옵션 간 영향 가능성                         |

### 프롬프트 레벨

| 문제                      | 설명                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 과교정(진자 운동)         | retry 프롬프트에 "원본에서 잘 되던 부분은 유지"가 없음. "문장 복잡" → "과단순"으로 반대 방향 튀는 현상 반복 |
| Formatting 규칙 미전달    | generation 프롬프트의 hard rules(느낌표 금지 등)이 retry 프롬프트에 없음                                    |
| Product context 비중 과다 | voice 섹션보다 product 정보가 토큰 수 기준 훨씬 많아 LLM이 product 방향으로 끌림                            |
| Full rewrite              | repair 프롬프트가 surgical edit가 아니라 사실상 재생성에 가까운 구조                                        |

### 테스트 결과 요약 (5회 기준)

| 테스트 | 1차 실패 | retry 성공률 |
| ------ | -------- | ------------ |
| 1      | 3/3      | 33%          |
| 2      | 3/3      | 0% (과교정)  |
| 3      | 3/3      | 67%          |
| 4      | 2/3      | 0% (과교정)  |
| 5      | 1/3      | 0%           |

반복 실패 원인: 느낌표 사용(4/5회), opening pattern 불일치(3/5회), 과교정(2/5회)

---

## 3. 설계 방향 논의 과정

### 3-1. Multi-criteria evaluation 도입 결정

현재 evaluator가 voice 1개뿐이라는 문제에서 출발해 평가 기준 확장을 검토했다.

**초기 방향 — Config B vs Config C 비교**

- **Config B**: voice + humanizer (AI 흔적 탐지)
- **Config C**: voice + humanizer + hook quality + insight depth

Config C가 창의성을 수렴시킬 수 있다는 우려로 POC를 먼저 실행했다. 실제 OpenAI로 생성한 3개 옵션을 두 설정으로 평가한 결과:

|                       | Voice | Humanizer | Hook | Insight | B    | C    |
| --------------------- | ----- | --------- | ---- | ------- | ---- | ---- |
| Option 1 (Story)      | ❌    | ✅        | ✅   | ✅      | FAIL | FAIL |
| Option 2 (Contrarian) | ❌    | ✅        | ❌   | ✅      | FAIL | FAIL |
| Option 3 (Data)       | ❌    | ❌        | ❌   | ✅      | FAIL | FAIL |

Voice가 전부 막아버려서 B vs C 차이가 드러나지 않았다. 그러나 voice를 통과했다고 가정하면 Config C만 Option 2를 추가로 걸렀고, 그 이유(generic opener, lacks specifics)는 실제로 문제였다. Hook과 Voice는 서로 다른 축을 잡는다는 것이 확인됐다.

**POC 결론**: 평가 기준 자체보다 generation 프롬프트가 먼저 개선돼야 한다. 그러나 Config C 방향이 맞다.

**이후 수정**: Hook을 hard filter로 쓰면 curiosity bait 방향으로 수렴한다는 피드백을 반영해, hook을 pairwise selection의 ranking signal로만 사용하는 방향으로 전환했다.

---

### 3-2. LangGraph 도입 여부 검토

#### 1단계 — 초기 LangGraph 설계 (선형 구조)

처음 제안한 LangGraph 설계:

```
generate_initial
      ↓
  evaluate_all  ←──────────────┐
      ↓                        │
  route                        │
  ├─ all passed → finalize     │
  ├─ max_retries → finalize    │
  └─ failures remain → repair ─┘
```

State는 옵션별로 독립 관리:

```
OptionState:
  text, angle_label, history, retry_count, status

GraphState:
  analysis, style_fingerprint, reference_samples, today_input
  options: list[OptionState], max_retries
```

**문제 인식**: 이 구조는 사실상 선형이다.

```
generate → evaluate_all → repair → evaluate_all → ...
```

`while` 루프로 충분하고 LangGraph가 필요하지 않다. 4개 evaluator도 각각 노드로 만들면 복잡도만 올라가므로 `asyncio.gather`로 하나의 노드 안에서 병렬 호출하면 된다.

#### 2단계 — Per-option parallel subgraph 검토

LangGraph가 의미있으려면 per-option 독립 병렬 구조여야 한다:

```
Main Graph:
  generate_initial (3개 생성)
        ↓
    fan_out ──→ Send("option_pipeline", option_1)
              → Send("option_pipeline", option_2)  ← 병렬 실행
              → Send("option_pipeline", option_3)
        ↓ (3개 모두 완료 후 fan_in)
    finalize

Option Subgraph (각 옵션마다 독립 실행):
  evaluate ──→ route ──→ passed/max_retries → END
                    └──→ failed → repair → evaluate (루프)
```

각 옵션이 자기만의 state machine을 가진다. Option 1이 1회에 통과해도 Option 3은 계속 repair 루프를 돌 수 있다. 서로 독립적이다.

이 구조라면 LangGraph가 가치를 가진다:

|                 | 현재 코드 | 선형 LangGraph | Per-option 병렬 LangGraph |
| --------------- | --------- | -------------- | ------------------------- |
| 루프 횟수       | 1회 고정  | N회 가능       | N회, 옵션별 독립          |
| 옵션별 state    | 없음      | 없음           | 각 옵션이 독립 history    |
| 병렬 실행       | 없음      | 없음           | 3 옵션 동시 실행          |
| LangGraph 필요? | ❌        | ❌             | ✅                        |

#### 3단계 — Per-option parallel도 asyncio로 가능

**핵심 질문**: per-option 독립 루프를 원한다면, generate 로직을 3번 호출해서 각각 option 1개씩 생성하면 되는 것 아닌가?

per-option 독립 루프, 병렬 실행, history 추적 전부 `asyncio.gather` + `while` + `dataclass`로 된다. LangGraph가 uniquely 추가하는 것이 없다.

State도 마찬가지다. LangGraph의 State도 결국 Python 객체다. `state.history`에 매 iteration 결과를 누적하면 repair 시점에 "1차에서 X가 문제였고, 수정 후 Y가 새로 생겼다"는 궤적을 그대로 참조할 수 있다.

#### 결론

LangGraph가 진짜 가치를 내는 상황:

- 실행 중간에 사람이 개입해야 할 때 (human-in-the-loop)
- 상태를 DB에 저장하고 재개해야 할 때 (persistence/checkpoint)
- 노드가 10개 이상이고 분기가 복잡할 때
- LangSmith 자동 tracing이 필요할 때

현재 generation pipeline은 "generation semantics"이지 "workflow semantics"가 아니다. `asyncio` + `while` 루프로 충분하다. LangGraph는 나중에 post 성과 분석 → profile 업데이트 pipeline(stateful workflow)에 도입한다.

---

### 3-3. LangChain ecosystem 선택적 도입

LangGraph 전체를 쓰지 않아도 LangChain ecosystem의 개별 컴포넌트는 유용하다.

- **PromptTemplate**: 프롬프트가 generation/repair/evaluator/selector 등 여러 개로 늘어날 때 관리 편의성
- **Structured Output (Pydantic)**: evaluator가 늘어날수록 JSON raw parsing이 깨지기 시작함. Pydantic 파싱으로 안정화
- **LangSmith**: 매 generation 요청의 전체 궤적 자동 tracing. 프롬프트 변경 시 golden set 기반 regression test. 지금 `docs/voice-matching-loop-test-results.md`에 수동으로 하는 것을 자동화

---

### 3-4. Quality evaluator의 위험성 인식

**"좋은 것을 정의하면 수렴한다"**

quality evaluator를 늘리면 해당 기준에 모든 생성 결과가 수렴한다. 각 사람마다 "좋은 포스트"의 기준이 다르고, 기준을 하나로 고정하면 다양성이 사라진다.

**방향 전환**: evaluation은 "나쁜 것을 제거"하는 역할만. "좋은 것을 만드는" 것은 generation prompt의 책임.

**Hook evaluator 재설계**: hard filter로 쓰면 engagement-optimized sludge(curiosity bait, rhetorical contrast, "Nobody talks about this") 방향으로 수렴. → pairwise ranking signal로만 사용.

**Insight evaluator 재설계**: "insight 있음/없음" 판단하면 fake profundity("Maybe the real problem isn't X, but Y") 스타일로 수렴. → novelty detector로 전환: reference posts와 semantic overlap이 과도하게 높은가?

---

### 3-5. Repair-heavy 구조의 위험성

**초기 설계**: generate → evaluate → repair → re-evaluate 루프, max_retries 증가

**문제 인식**: "AI correcting AI correcting AI" 구조가 되면:

- entropy collapse: 반복할수록 평균적인 출력으로 수렴
- over-smoothing: 거친 개성이 제거되고 매끄럽지만 밋밋해짐
- voice flattening: 사용자의 특이한 문체가 "올바른" 방향으로 교정됨

**핵심 구분**:

- repair 가능: punctuation, AI 문구, rhetorical question, hallucinated metric — 로컬/포맷 문제
- repair 불가능: insight 부족, framing 문제 — thought quality 문제. 수술로 못 고침

**결론**: repair는 최소화. insight/framing 문제는 해당 후보를 버리고 다른 후보를 선택하거나, Layer 1에서 더 많이 생성하는 방향으로 해결.

---

### 3-6. Early pruning으로 latency 전략 전환

**초기 접근**: sequential repair loop 횟수 줄이기 (max_retries 제한, SSE streaming)

**더 효과적인 접근**: early pruning

```
generate 8개 → Tier 1 cheap filter → Tier 2 LLM filter → top 3 → pairwise
```

expensive evaluator를 적은 후보에 늦게 적용하면:

- 전체 LLM 호출 수가 줄어듦
- repair loop 자체가 줄어듦 (이미 좋은 후보만 남아있으므로)

Evaluator를 비용 순으로 계층화:

- **Tier 1 (rule-based, ~0ms)**: 코드로 즉시 필터링
- **Tier 2 (small LLM, ~2-3s)**: voice, humanizer
- **Tier 3 (strong model, ~2s)**: pairwise selection

---

## 4. 설계 철학

### Evaluator의 역할 경계

**해도 되는 것:**

- obvious AI artifact 제거 (humanizer 패턴)
- hallucination 제거 (근거 없는 수치/사실)
- severe voice drift 제거 (form 불일치)

**절대 하면 안 되는 것:**

- engagement 직접 최적화
- generic hook quality 점수화
- "깊어 보임" 최적화
- tone 균질화

이 경계가 없으면 시스템이 linkedin motivational slop generator로 수렴한다.

### Repair의 역할 경계

**repair 대상:** punctuation, AI 문구, rhetorical question, hallucinated metric — 로컬/포맷 수정만  
**regenerate 대상:** insight 부족, framing 문제, voice의 본질적 불일치 — 이건 수술로 못 고침

"AI correcting AI correcting AI" 구조가 되면 entropy collapse, voice flattening이 발생한다.

### Quality는 generation이 책임진다

quality evaluator를 늘릴수록 생성 결과가 평균으로 수렴한다. 좋은 generation prompt가 먼저이고, evaluation은 fail-safe 역할만 한다.

---

## 5. 새 아키텍처

### 전체 흐름 (4-Layer)

```
[Layer 1 — Exploration]
  Generate N candidates (N=8 예정)
  다양성 최대화: angle, perspective, rhythm, abstraction level
  이 단계에서 평가 없음
        ↓

[Layer 2 — Hard Filters]
  Tier 1 (rule-based, ~0s): punctuation, AI phrases, forbidden patterns
  Tier 2 (Gemini flash-lite): voice evaluator, humanizer evaluator
  실패 → 즉시 제거 (repair 없음)
  목표: top 3-4 후보 남기기
        ↓

[Layer 3 — Selection]
  Pairwise comparison (LLM)
  score-based ranking 금지 → 수렴 방지
  "A vs B 중 더 interesting한 것?" tournament
  최종 3개 선택
        ↓

[Layer 4 — Repair Loop]
  formatting / local fixes만 (surgical edit)
  max_retries = 2
  insight/framing 문제 → repair 없이 그대로 반환 + feedback
```

### Evaluator 계층

```
Tier 1 — Rule-based (코드, ~0ms)
  punctuation violations (!, : 등 reference에 없는 것)
  AI vocabulary (game-changer, testament, ecosystem, ...)
  forbidden opening patterns
  length constraint

Tier 2 — Gemini flash-lite (~2-3s, 병렬)
  voice evaluator: form 일치 여부 (기존 개선)
  humanizer evaluator: AI smell 29 패턴 체크

Tier 3 — Selection (~2s)
  pairwise preference: 최종 3개 tournament 선택
```

### Hook / Insight evaluator 처리

**Hook evaluator**: hard filter 아님. pairwise selection의 ranking signal로만 사용.  
이유: hard judge로 쓰면 curiosity bait, rhetorical contrast 방향으로 수렴.

**Insight evaluator**: pass/fail 아님. novelty detector로 구현.  
기준: reference posts와 semantic overlap이 과도하게 높은가?  
이유: "insight 있음/없음" 판단하면 fake profundity 스타일로 수렴.

### Repair 프롬프트 설계 원칙

```
Preserve (명시적으로 유지 지시):
  - rhythm
  - sentence structure
  - pacing
  - insight / core observation

Only modify (명시적으로 지정된 것만):
  - rhetorical question → declarative
  - exclamation mark 제거
  - AI-sounding transition 제거
  - hallucinated metric 제거
```

full rewrite 금지. diff-based surgical edit만.

---

## 6. 파일 구조

```
app/post_draft/
  generation_pipeline/
    __init__.py
    state.py          # IterationRecord, OptionState dataclass
    evaluators.py     # Tier 1 rule-based + Tier 2 LLM evaluators
    prompts.py        # 모든 프롬프트 빌더 (PromptTemplate 사용)
    pipeline.py       # 4-layer 실행 로직 (asyncio + while loop)
    selector.py       # pairwise tournament
  option_generation_service.py   # 기존 → pipeline.py로 대체
  voice_evaluator_service.py     # 기존 → evaluators.py로 통합
```

### State 구조

```python
@dataclass
class IterationRecord:
    text: str
    tier1_issues: list[str]   # rule-based 위반
    voice_issues: list[str]
    humanizer_issues: list[str]
    iteration: int

@dataclass
class OptionState:
    text: str
    angle_label: str
    history: list[IterationRecord]
    retry_count: int
    status: str  # "pending" | "passed" | "accepted"
```

### Orchestration

LangGraph 없이 asyncio + while loop 직접 구현.  
이유: generation semantics이지 workflow semantics이 아님. asyncio로 충분.

```python
# 3개 옵션 독립 병렬 실행
results = await asyncio.gather(
    run_option_loop(opt1, context),
    run_option_loop(opt2, context),
    run_option_loop(opt3, context),
)
```

---

## 7. Latency 전략

### 실제 시간 단축

| 방법                        | 절감                                |
| --------------------------- | ----------------------------------- |
| Early pruning (N=8 → top 3) | expensive eval을 적은 후보에만 적용 |
| Tier 1 rule-based           | LLM 호출 없이 즉시 필터링           |
| Voice를 gate로 먼저 실행    | voice 실패 시 나머지 eval 생략      |
| max_retries = 2             | repair cycle 제한                   |

### 체감 Latency 단축

SSE(Server-Sent Events)로 옵션별 streaming 제공.  
먼저 완료된 옵션부터 프론트에 표시.

```
t=0s  "생성 중..."
t=4s  Option 1 완료 → 표시
t=6s  Option 3 완료 → 표시
t=9s  Option 2 완료 (repair 2회) → 표시
```

---

## 8. 관찰 / 평가 시스템 (LangSmith)

LangSmith를 통해 구축:

**Tracing**: 매 generation 요청의 전체 궤적 자동 기록

```
option_1_v1 → voice fail → repair → option_1_v2 → passed
option_2_v1 → passed
option_3_v1 → humanizer fail → discarded → regenerate → passed
```

**Golden Set**: (voice_profile, product_analysis, today_input) × 10개 케이스 구축  
**Regression Test**: 프롬프트 변경 시 golden set 자동 재실행, 성능 비교  
**Metrics**: voice pass율, humanizer pass율, 평균 iteration 수, pairwise win율

---

## 9. LangChain 도입 범위

| 컴포넌트               | 용도                                       | 도입 여부             |
| ---------------------- | ------------------------------------------ | --------------------- |
| PromptTemplate         | 프롬프트 관리, 변수 주입                   | ✅                    |
| Structured Output      | Pydantic으로 evaluator 응답 파싱 안정화    | ✅                    |
| LangSmith              | Tracing, golden set, regression test       | ✅                    |
| LangGraph (generation) | generation runtime orchestration           | ❌ asyncio로 충분     |
| LangGraph (analytics)  | post 성과 분석 → profile 업데이트 pipeline | 📋 미래 기능에서 도입 |

---

## 10. 미래 기능 고려 (Post Performance Feedback Loop)

지금 설계와 충돌하지 않게 미리 고려할 구조:

```
published posts
    ↓
engagement analytics (저장, 답글, 클릭)
    ↓
pattern extraction (어떤 angle/framing이 성과 좋았나)
    ↓
Adaptive strategy layer 업데이트

Identity layer (절대 변경 안 함):
  writing rhythm, sentence behavior, punctuation habits

Adaptive layer (성과 데이터로 조정 가능):
  hook style, topic framing, angle selection
```

engagement optimization만 하면 clickbait 수렴. identity와 strategy를 반드시 분리.

이 pipeline은 stateful workflow에 가까워 LangGraph 도입 검토 시점.

---

## 11. 구현 우선순위

1. Generation prompt 전면 재설계 (voice 비중 상향, formatting rule 파생, angle-opening 충돌 해소)
2. Tier 1 rule-based evaluator 구현
3. Humanizer evaluator (Tier 2) 구현
4. Voice evaluator 개선 (per-option 독립, formatting constraint 강화)
5. Repair를 surgical edit으로 변경 (과교정 방지 지시 추가)
6. 4-layer pipeline 조립 (asyncio)
7. Pairwise selector 구현
8. LangSmith 연동 + golden set 구축
9. SSE streaming 프론트엔드 연동
