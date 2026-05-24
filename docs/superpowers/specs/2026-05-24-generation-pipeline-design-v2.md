# Post Draft Generation Pipeline — Design Spec v2

작성일: 2026-05-24  
이전 문서: `2026-05-23-generation-pipeline-design.md` (초안 + 논의 과정)

---

## 1. 현재 구조 및 문제점

### 현재 파일 구성

```
app/post_draft/
  option_generation_service.py   # 생성 + 1회 retry 루프
  voice_evaluator_service.py     # 단일 voice evaluator (3개 배치)
```

### 현재 실행 흐름

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

### 문제점

**아키텍처 레벨**

| 문제 | 설명 |
|---|---|
| 1회 retry 고정 | 2차 평가 후에도 실패 시 그대로 반환. 테스트 5회 중 3회에서 retry 후 실패 잔존 |
| 평가 기준 1개 | voice match만 존재. AI 흔적, 할루시네이션 탐지 없음 |
| 배치 평가 | 3개 옵션을 한 프롬프트에서 동시 평가 → 옵션 간 영향 가능성 |

**프롬프트 레벨**

| 문제 | 설명 |
|---|---|
| 과교정 (pendulum) | repair 프롬프트에 "원본에서 잘 됐던 부분은 유지" 지시 없음. "문장 복잡" → "과단순"으로 반대 방향 튀는 현상 |
| Formatting 규칙 미전달 | generation prompt의 hard rules(느낌표 금지 등)이 repair prompt에 없음 |
| Product context 비중 과다 | voice 섹션보다 product 정보가 토큰 수 기준 훨씬 많아 LLM이 product 방향으로 끌림 |
| Full rewrite | repair prompt가 surgical edit가 아니라 사실상 재생성에 가까운 구조 |

**테스트 결과 (5회 기준)**

| 테스트 | 1차 실패 | retry 성공률 |
|---|---|---|
| 1 | 3/3 | 33% |
| 2 | 3/3 | 0% (과교정) |
| 3 | 3/3 | 67% |
| 4 | 2/3 | 0% (과교정) |
| 5 | 1/3 | 0% |

반복 실패 원인: 느낌표 사용(4/5회), opening pattern 불일치(3/5회), 과교정(2/5회)

---

## 2. 설계 결정 사항

논의 과정에서 검토하고 결정한 사항들.

### 2-1. LangGraph 제외, asyncio 채택

LangGraph를 generation pipeline에 도입할 경우를 세 단계로 검토했다.

- **선형 구조**: generate → evaluate → repair → evaluate 루프. 사실상 while 루프와 동일. LangGraph가 추가하는 것 없음.
- **Per-option 병렬 subgraph**: 각 옵션이 독립 state machine. LangGraph가 의미있는 유일한 구조. 그러나 `asyncio.gather + while + dataclass`로 동일하게 구현 가능. LangGraph가 uniquely 추가하는 것 없음.

**결론**: generation pipeline은 "generation semantics"이지 "workflow semantics"가 아니다. asyncio로 충분하다.  
LangGraph는 미래 post 성과 분석 → profile 업데이트 pipeline (stateful workflow)에 도입한다.

### 2-2. N=8 제외, N=3 유지

초기 설계에서는 N=8 생성 후 cheap filter로 early pruning하는 방향을 검토했다.

**제외 이유**:
- Generation prompt가 고쳐지지 않은 상태에서 8개 생성하면 나쁜 옵션 8개만 나온다.
- Per-option LLM 평가(Gemini)를 8번 호출하면 현재 3번보다 비용이 늘어난다.
- "Expensive evaluator를 적은 후보에 늦게 적용"이라는 논리는 Tier 1이 실제로 많은 수를 걸러낼 때만 성립한다.

**결론**: N=3으로 시작하고, generation prompt 개선 후 pass rate를 측정해 필요하면 N=5로 늘린다.

### 2-3. Pairwise tournament 제외

초기 설계에서는 filter 통과한 후보 중 "A vs B 중 더 interesting한 것?" tournament로 top 3를 선발하는 방향을 검토했다.

**제외 이유**:
- LLM이 "interesting"을 판단할 때 LLM 자체의 aesthetic preference가 개입된다. "AI judging AI"의 다른 형태.
- 다양성은 generation prompt에서 angle을 강제 지정하는 것으로 이미 보장된다. tournament가 다양성을 보장하는 게 아니다.
- filter 통과한 3개 후보 중 앞에서 3개를 반환하는 것으로 충분하다.

**결론**: pairwise tournament 제외. `selector.py` 파일 없음.

### 2-4. Humanizer → 코드 처리

초기 설계에서는 humanizer를 Gemini flash-lite LLM evaluator로 구현했다 (POC 코드 참조).

**제외 이유**: humanizer가 탐지하는 7가지 패턴을 보면 전부 특정 단어/구문/구조의 목록이다.

```
AI vocabulary:        "testament", "ecosystem", "game-changer" ...  → 단어 목록
Significance:         "unprecedented", "pivotal moment" ...         → 구문 목록
Promotional:          "empowering developers to" ...                → 구문 목록
Signposting:          "Let's dive in", "Here's the thing" ...       → 구문 목록
Neg. parallelism:     "It's not just X, it's Y"                     → 패턴
Copula avoidance:     "serves as", "functions as"                   → 구문 목록
Generic endings:      "The future looks bright" ...                 → 구문 목록
```

목록 비교 작업에 LLM이 필요하지 않다. `artifact_filter.py`에서 코드로 처리한다.

### 2-5. Quality evaluator 제외

hook quality, insight depth를 hard filter로 도입하는 방향을 검토했다.

**제외 이유**: "좋은 것을 정의하면 수렴한다."

- hook quality → curiosity bait, rhetorical contrast 방향으로 수렴
- insight depth → fake profundity ("Maybe the real problem isn't X, but Y") 방향으로 수렴
- 어떤 기준을 hard filter로 넣든, 생성 결과가 그 기준을 향해 최적화된다.
- 사람마다 "좋은 포스트"의 기준이 다르다. 기준을 하나로 고정하면 다양성이 사라진다.

**결론**: evaluation은 "나쁜 것을 제거"하는 역할만 한다. "좋은 것을 만드는" 것은 generation prompt의 책임이다. 최종 퀄리티 판단은 사용자가 3개 중 선택할 때 이루어진다.

---

## 3. 설계 철학

### Evaluation의 역할 경계

**해도 되는 것:**
- AI writing artifact 제거 (humanizer 패턴)
- 할루시네이션 탐지 (근거 없는 수치)
- Voice form 불일치 제거 (rhythm, sentence pattern)

**하면 안 되는 것:**
- Hook quality 점수화
- Insight 있음/없음 판단
- Engagement 직접 최적화
- Tone 균질화

이 경계가 없으면 시스템이 linkedin motivational slop generator로 수렴한다.

### Repair의 역할 경계

**repair 가능:** punctuation, AI 문구, hallucinated metric — 로컬/포맷 문제  
**repair 불가능:** insight 부족, framing 문제, voice의 본질적 불일치 — regenerate로 해결

"AI correcting AI correcting AI" 구조가 되면 entropy collapse, voice flattening이 발생한다.

### Quality는 generation이 책임진다

quality evaluator를 늘릴수록 생성 결과가 평균으로 수렴한다. 좋은 generation prompt가 먼저이고, evaluation은 fail-safe 역할만 한다.

---

## 4. 코드 vs LLM 처리 구분

### 코드 (deterministic)

**Auto-correct — 텍스트 직접 수정**

| 대상 | 처리 |
|---|---|
| `!` | 제거 |
| 문장 끝 `:` | 제거 |
| reference에 없는 emoji | 제거 |

**Artifact detection — 위반 구문 특정 (감지만, 수정 안 함)**

패턴을 감지하면 위반 구문을 정확히 추출해서 issues 목록에 추가한다.
단어/구문 제거 시 문장이 깨지므로 자연스러운 수정은 Phase 5 repair LLM이 담당한다.

| 카테고리 | 예시 패턴 |
|---|---|
| AI vocabulary | `game-changer`, `testament`, `ecosystem`, `pivotal`, `seamless`, `robust`, `leverag*`, `transformative` |
| Signposting | `Let's dive in`, `Here's the thing`, `In conclusion`, `Here's what I learned` |
| Negative parallelism | `It's not just X, it's Y` 패턴 |
| Copula avoidance | `serves as`, `functions as`, `boasts` |
| Significance inflation | `unprecedented`, `it changes everything`, `marking a pivotal moment` |
| Promotional language | `empowering developers to`, `delivering seamless experiences` |
| Generic endings | `The future looks bright`, `exciting times ahead` |
| Forbidden openings | `Six months ago,`, `Last year,`, `A year ago,`, `Two weeks ago,` |
| Length | 500자 초과 |

**Specificity check — 구체성 부재 탐지**

숫자, 도구 이름, 구체적 상황이 하나도 없으면 fail. 수렴 위험이 낮은 이유: specificity는 퀄리티의 필요조건이지 충분조건이 아니라 최적화 방향이 생기지 않는다.

**Hallucination check — Number grounding**

```
1. 생성 텍스트에서 숫자 추출 (regex)
2. today_input + product_analysis에 해당 숫자 존재 여부 확인
3. 없으면 → hallucination flag, fail
```

### AI (LLM 호출)

| 호출 | 모델 | 역할 |
|---|---|---|
| 생성 | OpenAI | 3개 옵션 생성 |
| Voice 평가 | Gemini flash-lite | form 일치 여부 (rhythm, sentence pattern, punctuation habits) |
| 재생성 | OpenAI | 실패한 옵션 surgical repair |

Voice 평가가 LLM이어야 하는 이유: rhythm, sentence pacing, 문체의 "느낌"은 패턴 목록으로 정의할 수 없다. 사용자마다 다르고, 같은 규칙도 맥락에 따라 달라진다.

---

## 5. 최종 아키텍처 및 Flow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1. GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OpenAI: 3개 옵션 생성 (1번 호출)
  · 3개 angle 강제 지정 (Story, Contrarian, Technical 등)
  · voice rules + forbidden patterns 명시
  · "구체적인 것 포함" 지시 (specificity는 생성 단계에서)
  · 숫자는 today_input에 있는 것만 사용, 없으면 생략

                    ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2. PER-OPTION ARTIFACT FILTER  (병렬, 코드, ~0ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

각 옵션에 대해 순서대로:

  Step 1. Auto-correct  ← 직접 텍스트 수정 (LLM 없음)
    · "!" 제거
    · 문장 끝 ":" 제거
    · reference에 없는 emoji 제거

  Step 2. Artifact detection  ← 감지만, 수정 안 함
    · AI writing 패턴 (vocabulary, signposting, parallelism, copula, inflation, promotional, generic ending)
    · Forbidden openings
    · 500자 초과
    → 위반 구문을 정확히 특정해서 artifact_issues에 추가
       예) "testament: 'This is a testament to the power of...'"
           "signposting: 'Let me share what I learned'"

  Step 3. Specificity check
    · 숫자, 도구 이름, 구체적 상황이 하나도 없으면 artifact_issues에 추가

  Step 4. Hallucination check
    · 생성 텍스트의 숫자가 today_input에 없으면 artifact_issues에 추가

  결과와 무관하게 → Phase 3으로 (Voice evaluation은 항상 실행)
  artifact_issues는 Phase 5 repair prompt에 전달

                    ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3. VOICE EVALUATION  (모든 옵션, 병렬, LLM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gemini flash-lite, per-option 독립 호출
Phase 2의 auto-correct된 텍스트 기준으로 평가

  평가 대상: form
    · rhythm, sentence pattern, pacing
    · 사용자 reference posts와 비교

  평가하지 않는 것:
    · topic / content quality
    · hook quality (수렴 위험)
    · insight depth (수렴 위험)

  → voice_issues 수집 (pass 여부와 무관하게 repair prompt에 전달)

                    ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4. ASSEMBLY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  artifact_issues + voice_issues 모두 없음 → return ✓
  하나라도 있음 → Repair pass로

                    ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 5. REPAIR PASS  (1회만, 실패한 옵션만)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OpenAI: 실패 옵션 재생성

  코드(Phase 2)가 감지한 구문을 정확히 지정 → LLM이 그 구문을 자연스럽게 재작성
  LLM(Phase 3)이 감지한 voice 문제도 함께 전달

  repair prompt에 전달되는 것:
    · artifact_issues: 정확한 구문 + 카테고리
        예) "testament: 'This is a testament to...' → AI-sounding, rephrase naturally"
    · voice_issues: Gemini가 감지한 form 문제
        예) "rhythm mismatch: sentences too long compared to reference posts"
    · 지시: "위 문제만 수정. rhythm / structure / core observation은 유지. 전체 재작성 금지."
    · 같은 angle 유지

  재생성 결과 → Auto-correct → Artifact detection → Voice evaluation
  (한 번만, 이 결과가 최종)

                    ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 6. RETURN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

통과한 옵션 반환
끝까지 실패한 옵션 → 그대로 반환 + feedback (사용자에게 표시)
```

### LLM 호출 수

| 케이스 | 호출 수 |
|---|---|
| 전부 통과 | OpenAI 1 + Gemini 3 = **4회** |
| 1개 실패 | OpenAI 1 + Gemini 3 + OpenAI 1 + Gemini 1 = **6회** |
| 전부 실패 | OpenAI 1 + Gemini 3 + OpenAI 1 + Gemini 3 = **8회** |

Phase 3을 모든 옵션에 실행하므로 (artifact filter pass/fail 무관) repair가 artifact + voice issues를 동시에 받아 한 번에 처리할 수 있다. Gemini 호출이 늘지만 repair의 정보 완전성이 보장된다.

---

## 6. 검증 및 평가 시스템

### 자동 탐지 (파이프라인 내부)

| 항목 | 방법 | 위치 |
|---|---|---|
| AI writing artifact | 코드 (패턴 목록) | artifact_filter.py |
| Voice rule 위반 | 코드 (패턴 목록) | artifact_filter.py |
| Specificity 부재 | 코드 (숫자/고유명사 감지) | artifact_filter.py |
| Number hallucination | 코드 (number grounding) | artifact_filter.py |
| Voice form 불일치 | LLM — Gemini flash-lite | voice_evaluator.py |
| Hook quality | 탐지 안 함 (수렴 위험) | — |
| Insight depth | 탐지 안 함 (수렴 위험) | — |

### Offline 평가 (배포 전, LangSmith)

**Golden Set 구성**: (voice_profile, product_analysis, today_input) × 10-15개 케이스

케이스 기준:
- 다양한 voice 패턴 (짧은 문장 / 긴 문장, emoji 있음 / 없음)
- 다양한 today_input 유형 (수치 있음 / 없음, 감정적 / 기술적)
- 엣지 케이스 (today_input 없음, signature phrase 있는 user)
- 각 케이스에 "이 결과가 좋다"는 기준을 수동 라벨링

**Prompt Experiment**: 프롬프트 변경 시 golden set 자동 재실행, 이전 결과와 비교

**추적 지표:**
- artifact pass rate
- voice match rate
- number hallucination rate
- 평균 repair 횟수

**LangSmith tracing 예시:**
```
option_1_v1 → artifact fail (signposting) → repair → option_1_v2 → passed
option_2_v1 → voice fail (rhythm mismatch) → repair → option_2_v2 → passed
option_3_v1 → passed
```

### Online 평가 (배포 후, 사용자 행동)

| 행동 | 신호 의미 |
|---|---|
| 옵션 선택 | 선호 angle, framing 데이터 |
| 선택 후 수정 없이 post | 높은 퀄리티 신호 |
| 선택 후 대폭 수정 | 낮은 퀄리티 신호 |
| regenerate 클릭 | 3개 전부 부족 |

이 데이터는 장기적으로 adaptive strategy layer (미래 기능)의 입력이 된다.

---

## 7. 파일 구조

```
app/post_draft/
  generation_pipeline/
    __init__.py
    state.py              # OptionState dataclass
    artifact_filter.py    # auto-correct + 패턴 필터 (코드만, LLM 없음)
    voice_evaluator.py    # Gemini per-option 호출
    prompts.py            # generation + repair prompt builder
    pipeline.py           # Phase 1-6 orchestration (asyncio)
  option_generation_service.py  # pipeline.generate() 얇은 wrapper (기존 대체)
  voice_evaluator_service.py    # voice_evaluator.py로 대체, 삭제 예정
```

### State 구조

```python
@dataclass
class OptionState:
    text: str
    angle_label: str
    artifact_issues: list[str]   # artifact filter 위반 (코드 탐지)
    voice_issues: list[str]      # voice evaluator 위반 (LLM 탐지)
    status: str                  # "passed" | "failed"
    attempt: int                 # 0 = first pass, 1 = repair pass
```

`history: list[IterationRecord]` 중첩 이력 안 쌓음 — repair가 1회이므로 이력 누적 불필요.

---

## 8. 외부 라이브러리 도입 범위

| 컴포넌트 | 용도 | 도입 여부 | 이유 |
|---|---|---|---|
| `langsmith` | Tracing, golden set, regression test | ✅ | LangChain과 독립 패키지 |
| LangChain | LLM 추상화, PromptTemplate | ❌ | native SDK가 더 직접적. 해결하는 문제 없음 |
| LangGraph (generation) | generation orchestration | ❌ | asyncio로 충분 |
| LangGraph (agentic) | Research/Planning/Evaluation Agent | 미래 기능 | Agentic System 도입 시 |
| Pydantic | 응답 파싱 안정화 | ✅ | FastAPI 스택에 이미 포함 |

**LangChain을 도입하지 않는 이유:**  
OpenAI SDK, Google genai SDK가 이미 structured output (response_schema, response_format)을 지원한다. LangChain이 추가로 해결하는 문제가 없고, 추상화 레이어가 늘어나면 디버깅이 어려워진다. LangChain이 가치를 내는 상황은 multi-provider 전환, RAG 파이프라인, tool-use agent처럼 LLM을 재료로 시스템을 조립할 때다.

---

## 9. 미래 기능 (Post Performance Feedback Loop)

현재 설계와 충돌하지 않게 미리 고려할 구조:

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

---

## 10. Agentic System 방향 (장기 비전)

현재 시스템은 사용자가 today_input을 제공하면 generation pipeline이 3개 옵션을 반환하는 구조다. 장기적으로 이 시스템을 agentic하게 만드는 방향을 검토했다.

### Agentic 레벨 정의

**Level 1 — Context-aware** (현재 + α)
고정된 API를 항상 호출해서 context를 보강한다. LLM이 결정하는 것 없음. LangGraph 불필요.

**Level 2 — Research Agent**  
LLM이 스스로 무엇을 조사할지 결정한다. 제품 카테고리, 오늘의 맥락을 보고 Threads 트렌드, Hacker News, 사용자 post history 등에서 관련 정보를 찾는다. Tool use 루프. LangGraph 도입 시점.

**Level 3 — Planning + Generation Agent**  
Research 결과를 바탕으로 LLM이 전체 생성 전략을 설계한다. 각도 브레인스토밍 → 평가 → 선택 → generation → 결과 평가 → 불만족 시 Planning으로 되돌아가는 루프. 비선형 다단계 의사결정.

**Level 4 — Autonomous Agent**  
사용자가 today_input을 입력하지 않아도 스스로 작동한다. GitHub 커밋 내역, Threads 반응, 마지막 게시 시점을 보고 "지금 포스팅할 만한 내용"을 판단해서 드래프트를 준비해둔다.

### 아키텍처 (Agentic 적용 시)

```
[Research Node]        LLM이 무엇을 찾을지 결정 → Tool 호출
  · Threads API        사용자 최근 게시물, 트렌딩 컨텐츠
  · GitHub API         최근 커밋, PR 내역
  · Web search         커뮤니티 동향, 시장 트렌드
  · Post history DB    반복 방지, 미사용 각도 파악
        ↓
[Planning Node]        수집된 context 기반 전략 설계
  · 유효한 각도 브레인스토밍
  · 각도 평가 및 선택
        ↓
[Generation Node]      현재 설계한 pipeline (변경 없음)
  · artifact filter
  · voice evaluation
  · repair
        ↓
[Evaluation Node]      결과 평가
  · 만족 → present
  · 불만족 → Planning Node로 되돌아감 (LangGraph 루프)
        ↓
사용자에게 제시 (또는 Autonomous면 알림 후 승인 대기)
```

현재 설계한 generation pipeline은 이 구조에서 **Generation Node** 역할을 그대로 한다. 폐기되는 것이 없다.

### LangGraph가 정당화되는 이유 (Agentic 도입 시)

| 조건 | 상황 |
|---|---|
| 비선형 흐름 (루프, 분기) | Evaluation → Planning 되돌아가기 |
| Tool use | 검색, GitHub API, Threads API |
| 노드 간 공유 상태 | research context, planning context |
| Persistent state | Autonomous 모드, 스케줄 기반 실행 |

### 구현 순서 (현재 계획과의 관계)

```
Phase A (현재 계획): generation pipeline v2 구현 및 품질 안정화
Phase B: Research Agent 설계 + LangGraph 도입 + Tool 연동
Phase C: Planning Agent + Evaluation Agent + 루프 구현
Phase D: Autonomous mode + 스케줄러 + 알림
```

Phase A가 완성되고 generation 품질이 검증된 후 Phase B를 시작한다. 기반이 좋아야 agent가 의미있다.

---

## 10. 구현 순서

| 순서 | 항목 | 비고 |
|---|---|---|
| 1 | Generation prompt 전면 재설계 | voice 비중 상향, forbidden patterns 명시, specificity 지시 |
| 2 | LangSmith 연동 | prompt iteration 결과를 즉시 추적하기 위해 early 도입 |
| 3 | `artifact_filter.py` 구현 | humanizer 포함, 코드만, 테스트 쉬움 |
| 4 | `voice_evaluator.py` per-option 개선 | 기존 배치 평가 → per-option 독립 호출 |
| 5 | `state.py` + `prompts.py` 정리 | surgical repair prompt 포함 |
| 6 | `pipeline.py` 조립 | end-to-end 통합 테스트 가능 시점 |
| 7 | pass rate 측정 | N=5 필요 여부 데이터 기반 결정 |
| 8 | SSE streaming | 파이프라인 안정화 후 UX 개선 |
