# Generation Pipeline v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/post_draft/option_generation_service.py`와 `voice_evaluator_service.py`를 새로운 `generation_pipeline/` 모듈로 대체한다.

**Architecture:** 6-phase pipeline — Generation → Artifact Filter (code) → Voice Evaluation (LLM, 모든 옵션) → Assembly → Repair Pass → Return. 코드는 감지만, LLM이 자연스럽게 수정하는 역할 분리 구조.

**Tech Stack:** Python asyncio, OpenAI (generation/repair), Gemini flash-lite (voice eval), LangSmith (tracing), pytest-asyncio (tests)

**Design Spec:** `docs/superpowers/specs/2026-05-24-generation-pipeline-design-v2.md` — 구현 전 반드시 읽을 것. 모든 설계 결정의 근거가 여기 있다.

---

## 파일 구조

**생성:**
```
app/post_draft/generation_pipeline/
  __init__.py
  state.py            # OptionState dataclass
  artifact_filter.py  # auto-correct + 패턴 감지 (코드만, LLM 없음)
  voice_evaluator.py  # per-option Gemini 호출
  prompts.py          # generation + repair prompt builder
  pipeline.py         # 6-phase orchestration

tests/unit/post_draft/generation_pipeline/
  __init__.py
  test_artifact_filter.py
  test_voice_evaluator.py
  test_prompts.py
  test_pipeline.py
```

**수정:**
```
app/post_draft/option_generation_service.py  # pipeline.generate() 얇은 wrapper로 교체
app/core/config.py                           # LANGSMITH_API_KEY 추가
.env.example                                 # LANGSMITH_API_KEY 추가
```

**삭제 (Task 7에서):**
```
app/post_draft/voice_evaluator_service.py    # voice_evaluator.py로 대체
```

---

## Task 1: 패키지 구조 + state.py

**Files:**
- Create: `app/post_draft/generation_pipeline/__init__.py`
- Create: `app/post_draft/generation_pipeline/state.py`
- Create: `tests/unit/post_draft/generation_pipeline/__init__.py`

**목적:** 이후 모든 task가 의존하는 기반. `OptionState`는 pipeline 전체에서 옵션 1개의 상태를 담는다.

**state.py가 정의할 것:**
- `OptionState` dataclass
  - `text: str` — 현재 옵션 텍스트 (auto-correct 이후 갱신됨)
  - `angle_label: str` — Story / Contrarian / Technical 등
  - `artifact_issues: list[str]` — 코드가 감지한 구문 수준 문제 ("testament: 'This is a testament to...'")
  - `voice_issues: list[str]` — Gemini가 감지한 form 문제
  - `status: str` — `"passed"` | `"failed"`
  - `attempt: int` — 0 = first pass, 1 = repair pass

**구현 참고:** dataclass는 `@dataclass`로 선언. 기존 코드에서 유사한 패턴을 찾으려면 `app/post_draft/option_generation_service.py`의 dict 구조 참고.

- [ ] `generation_pipeline/` 디렉토리와 `__init__.py` 생성
- [ ] `state.py`에 `OptionState` dataclass 작성
- [ ] `tests/unit/post_draft/generation_pipeline/__init__.py` 생성
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/ -v` 실행 (수집만 되면 OK)
- [ ] commit

---

## Task 2: artifact_filter.py

**Files:**
- Create: `app/post_draft/generation_pipeline/artifact_filter.py`
- Create: `tests/unit/post_draft/generation_pipeline/test_artifact_filter.py`

**목적:** AI writing artifact를 코드로 감지하고, safe한 것만 직접 수정한다. LLM 없음. 이 파일이 외부 API를 호출하는 일은 없다.

**artifact_filter.py가 제공할 함수들:**

`auto_correct(text: str) -> str`
- `!` 제거 (문장 부호로만 쓰인 경우)
- 문장 끝 `:` 제거
- reference에 없는 emoji는 이 함수에서 처리하지 않음 (style_fingerprint 없이는 판단 불가, voice evaluator에 위임)
- 텍스트 구조/의미를 바꾸지 않는 문자 수준 수정만

`detect_artifacts(text: str) -> list[str]`
- 설계 문서 Section 4의 패턴 목록 기준으로 위반 구문 감지
- 리턴: 위반된 구문을 정확히 특정한 문자열 목록
  - 예) `"AI vocabulary: 'game-changer' in '...this is a game-changer for...'"`
  - 예) `"signposting: 'Let's dive in'"`
- 위반 없으면 빈 리스트

`check_specificity(text: str) -> list[str]`
- 숫자, 알려진 도구/제품 이름, 구체적 상황 언급이 하나도 없으면 issue 반환
- 너무 strict하지 않게: 하나라도 있으면 pass
- 리턴: issue 있으면 `["specificity: no concrete detail found"]`, 없으면 `[]`

`check_hallucination(text: str, today_input: str | None) -> list[str]`
- 생성 텍스트에서 숫자 추출 (regex)
- today_input에 해당 숫자가 있는지 확인
- today_input이 None이면 숫자가 아예 없어야 함
- 리턴: 문제된 숫자 목록, 없으면 `[]`

`run(text: str, today_input: str | None) -> tuple[str, list[str]]`
- 위 함수들을 순서대로 실행하는 진입점
- 리턴: `(auto_correct된 텍스트, 모든 issues 합친 리스트)`
- pipeline.py가 이 함수만 호출하면 됨

**테스트 작성 기준:**

`test_artifact_filter.py`에 작성할 테스트 케이스 (각각 독립적, fixture 없이):

- `auto_correct`
  - `!` 포함된 텍스트 → 제거됨
  - `!` 없는 텍스트 → 변경 없음
  - 문장 끝 `:` → 제거됨

- `detect_artifacts`
  - AI vocabulary 단어가 포함된 텍스트 → issues에 해당 구문 포함
  - signposting 구문 포함 → issues에 포함
  - forbidden opening (`Six months ago,`) 포함 → issues에 포함
  - 위반 없는 깔끔한 텍스트 → 빈 리스트 반환
  - 여러 위반이 동시에 있을 때 → 각각 별도 issue로 반환

- `check_specificity`
  - 숫자 포함 텍스트 → pass (빈 리스트)
  - 알려진 도구 이름 (Stripe, Vercel, etc.) 포함 → pass
  - 완전히 generic한 텍스트 → issue 반환

- `check_hallucination`
  - 텍스트에 숫자 없음, today_input도 없음 → pass
  - 텍스트의 숫자가 today_input에 있음 → pass
  - 텍스트의 숫자가 today_input에 없음 → issue 반환
  - today_input이 None인데 텍스트에 숫자 있음 → issue 반환

- `run`
  - 전체 파이프라인: 위반 텍스트 넣으면 수정된 텍스트 + 이슈 목록 반환
  - 깔끔한 텍스트: 수정 없음 + 빈 이슈 목록

- [ ] `test_artifact_filter.py` 작성 (위 케이스 전부)
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_artifact_filter.py -v` 실행 → 전부 FAIL 확인
- [ ] `artifact_filter.py` 구현
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_artifact_filter.py -v` 실행 → 전부 PASS 확인
- [ ] `poetry run pytest` 실행 → 기존 테스트 깨지지 않음 확인
- [ ] commit

---

## Task 3: voice_evaluator.py

**Files:**
- Create: `app/post_draft/generation_pipeline/voice_evaluator.py`
- Create: `tests/unit/post_draft/generation_pipeline/test_voice_evaluator.py`
- Reference: `app/post_draft/voice_evaluator_service.py` (기존 구현 참고)

**목적:** 기존 `voice_evaluator_service.py`는 3개 옵션을 하나의 프롬프트에서 배치 평가했다. 이를 per-option 독립 호출로 전환한다. LLM 클라이언트 패턴은 기존 파일에서 그대로 가져온다.

**voice_evaluator.py가 제공할 함수:**

`evaluate_one(text: str, style_fingerprint: dict, reference_samples: list, today_input: str | None) -> list[str]`
- 옵션 하나의 텍스트만 받아서 voice form 평가
- 리턴: voice_issues 문자열 리스트, 문제 없으면 빈 리스트
- 예) `["rhythm mismatch: sentence too long compared to reference posts", "exclamation mark: reference posts have zero"]`

**평가 기준 (prompt에 반영할 것):**
- form 평가: rhythm, sentence pattern, pacing, punctuation habits
- 평가하지 않는 것: topic, content quality, hook quality, insight depth
- 기준: 사용자 reference posts와의 form 비교

**Gemini 호출 방식:** 기존 `voice_evaluator_service.py`의 패턴 참고. `app/llm/gemini.py`의 `get_gemini_client()` 사용.

**테스트 작성 기준 (`test_voice_evaluator.py`):**

Gemini 클라이언트를 mock해서 테스트. 기존 `tests/unit/post_draft/test_voice_evaluator_service.py` 패턴 참고.

- voice mismatch 응답을 mock → voice_issues 리스트 반환 확인
- voice match 응답을 mock → 빈 리스트 반환 확인
- Gemini 오류 발생 시 → `HTTPException` 발생 확인 (기존 동작 유지)

- [ ] `test_voice_evaluator.py` 작성
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_voice_evaluator.py -v` → FAIL 확인
- [ ] `voice_evaluator.py` 구현
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_voice_evaluator.py -v` → PASS 확인
- [ ] `poetry run pytest` 실행 → 기존 테스트 깨지지 않음 확인
- [ ] commit

---

## Task 4: prompts.py — Generation Prompt 재설계

**Files:**
- Create: `app/post_draft/generation_pipeline/prompts.py`
- Create: `tests/unit/post_draft/generation_pipeline/test_prompts.py`
- Reference: `app/post_draft/option_generation_service.py`의 `_build_generation_prompt()` (현재 구현 참고)

**목적:** 현재 generation prompt의 핵심 문제 — product context 비중이 voice보다 크고, forbidden patterns이 불완전하고, specificity 지시가 없다. 이를 재설계한다.

**`build_generation_prompt(analysis, style_fingerprint, reference_samples, today_input) -> str`**

재설계 방향 (기존 함수와 비교해서 반드시 개선할 것):

1. **Voice section 비중 상향**: prompt에서 voice fingerprint + reference samples 섹션이 product context 섹션보다 앞에, 더 강하게 강조되어야 한다. LLM이 제일 먼저 읽는 것이 voice여야 한다.

2. **Forbidden patterns 명시**: 현재 "no AI-cliche openers" 일부만 있다. `artifact_filter.py`의 detect_artifacts가 잡는 모든 카테고리 — AI vocabulary, signposting, negative parallelism, copula avoidance, significance inflation, promotional language, generic endings — 를 전부 "생성하지 말 것" 목록으로 명시한다.

3. **Specificity 지시 추가**: 숫자, 도구 이름, 구체적 상황 중 하나를 반드시 포함하라는 지시. today_input이 없을 때는 product의 구체적인 메커니즘 언급.

4. **Number grounding 지시 강화**: 현재도 있지만 더 강하게 — 숫자는 today_input에 있는 것만, 없으면 숫자를 쓰지 않는다.

5. **Angle-opening 우선순위 명시**: 기존의 "Priority order" 섹션 유지 + 강화.

**`build_repair_prompt(failed_options: list[OptionState], approved_options: list[OptionState], style_fingerprint, reference_samples, today_input) -> str`**

재설계 방향:

1. **Surgical edit 지시**: "이것만 수정, 나머지는 유지" 패턴을 명확하게. Preserve 목록(rhythm, structure, core observation)과 Fix 목록(artifact_issues + voice_issues)을 분리해서 명시.

2. **Issues를 구문 수준으로 전달**: OptionState의 `artifact_issues`와 `voice_issues`를 그대로 prompt에 넣는다. "sounds AI-written" 같은 뭉뚱그린 표현 대신 코드가 감지한 정확한 구문을 전달한다.

3. **전체 재작성 금지 명시**: "이 텍스트를 완전히 다시 쓰는 것이 아닌, 지정된 문제만 수정"을 명시.

4. **Formatting rules 전달**: generation prompt의 hard rules를 repair prompt에도 동일하게 포함. 현재 구현의 핵심 버그(repair 시 formatting rules 누락)를 수정.

**테스트 작성 기준 (`test_prompts.py`):**

prompt 내용을 문자열로 검증. LLM 호출 없음.

`build_generation_prompt`:
- voice fingerprint 정보가 product context보다 앞에 있음 (순서 확인)
- AI vocabulary 금지 목록이 포함됨
- specificity 지시가 포함됨
- today_input이 있을 때 숫자 grounding 지시 포함
- today_input이 None일 때 숫자 생성 금지 지시 포함

`build_repair_prompt`:
- OptionState의 artifact_issues 내용이 prompt에 포함됨
- OptionState의 voice_issues 내용이 prompt에 포함됨
- "유지할 것" 목록과 "수정할 것" 목록이 분리됨
- approved options가 "변경 금지" 섹션에 포함됨

- [ ] `test_prompts.py` 작성
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_prompts.py -v` → FAIL 확인
- [ ] `prompts.py` 구현 (build_generation_prompt + build_repair_prompt)
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_prompts.py -v` → PASS 확인
- [ ] commit

---

## Task 5: pipeline.py

**Files:**
- Create: `app/post_draft/generation_pipeline/pipeline.py`
- Create: `tests/unit/post_draft/generation_pipeline/test_pipeline.py`
- Reference: `app/post_draft/option_generation_service.py` (현재 generate() 로직 참고)
- Reference: `app/llm/openai.py` (OpenAI 클라이언트 패턴)

**목적:** 6-phase orchestration. 이 파일이 모든 조각을 연결한다.

**`generate(analysis, style_fingerprint, reference_samples, today_input) -> dict`**

반환 형태는 현재 `option_generation_service.generate()`와 동일하게 유지:
```
{
  "options": [{"text": str, "angle_label": str}, ...],
  "evaluation_feedback": [str, ...]
}
```
기존 API contract를 깨면 router와 integration test가 깨진다.

**6-phase 실행 흐름:**

- **Phase 1**: OpenAI로 3개 옵션 생성. `prompts.build_generation_prompt()` 사용. 응답 파싱 → `OptionState` 리스트 생성 (status="pending", attempt=0).

- **Phase 2**: 각 OptionState에 대해 `artifact_filter.run()` 실행. auto_correct된 텍스트로 `state.text` 갱신. `artifact_issues` 저장. asyncio로 병렬 실행.

- **Phase 3**: 모든 옵션에 대해 `voice_evaluator.evaluate_one()` 실행 (Phase 2 결과와 무관하게 전부). `voice_issues` 저장. `asyncio.gather`로 병렬 실행.

- **Phase 4**: `artifact_issues`와 `voice_issues` 둘 다 비어있으면 `status="passed"`. 하나라도 있으면 `status="failed"`. 모두 passed면 즉시 return.

- **Phase 5**: failed된 옵션들만 `prompts.build_repair_prompt()`로 재생성. OpenAI 호출. 재생성 결과에 Phase 2, 3을 다시 실행 (한 번만). 이 단계에서 통과하지 못한 것은 그대로 포함.

- **Phase 6**: 최종 options 리스트 반환. 끝까지 실패한 옵션은 `evaluation_feedback`에 포함.

**에러 처리:**
- Phase 1 OpenAI 실패 → `HTTPException(500)` (기존과 동일)
- Phase 3 Gemini 전체 실패 → graceful pass (모든 옵션 그대로 반환, feedback 없음). 기존 `voice_evaluator_service` 동작 유지.
- Phase 5 OpenAI 실패 → first-pass 옵션 그대로 반환 + evaluation_feedback 포함

**테스트 작성 기준 (`test_pipeline.py`):**

OpenAI, Gemini 클라이언트 전부 mock. 기존 `tests/unit/post_draft/test_option_generation_service.py` 패턴을 참고 (mock 구조 동일).

- 전부 통과 케이스: artifact_issues 없음 + voice_issues 없음 → 3개 옵션 반환, feedback 빈 리스트
- artifact fail 케이스: artifact_issues 있는 옵션 → repair 호출됨, repair 후 통과 시 feedback 없음
- voice fail 케이스: voice_issues 있는 옵션 → repair 호출됨
- repair 후에도 실패 케이스: evaluation_feedback에 해당 issues 포함
- Gemini 전체 장애 케이스: 모든 옵션 그대로 반환, feedback 빈 리스트
- Phase 1 OpenAI 실패 케이스: HTTPException(500)
- Phase 5 OpenAI 실패 케이스: first-pass 옵션 + feedback 반환

- [ ] `test_pipeline.py` 작성
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_pipeline.py -v` → FAIL 확인
- [ ] `pipeline.py` 구현
- [ ] `poetry run pytest tests/unit/post_draft/generation_pipeline/test_pipeline.py -v` → PASS 확인
- [ ] `poetry run pytest` 실행 → 전체 테스트 PASS 확인
- [ ] commit

---

## Task 6: LangSmith 연동

**Files:**
- Modify: `app/post_draft/generation_pipeline/pipeline.py`
- Modify: `app/core/config.py`
- Modify: `.env.example`

**목적:** 매 generation 요청의 전체 궤적을 자동으로 기록한다. prompt 변경 시 결과를 비교하는 기반.

**설정:**
- `config.py`에 `LANGSMITH_API_KEY: str = ""` 추가 (optional, 비어있으면 tracing 비활성화)
- `.env.example`에 `LANGSMITH_API_KEY=` 추가

**tracing 적용 위치:**
- `pipeline.generate()` 함수에 LangSmith `@traceable` 데코레이터 또는 run 감싸기
- 각 phase의 LLM 호출(OpenAI generation, Gemini voice eval, OpenAI repair)에 trace 추가
- artifact_filter는 LLM 없으므로 tracing 불필요

**추적해야 할 정보:**
- 각 옵션의 artifact_issues, voice_issues
- repair가 발생했는지, repair 후 상태
- 최종 passed/failed 수

**LangSmith SDK 사용:** `langsmith` 패키지. `poetry add langsmith`로 설치. 공식 Python SDK 참고.

- [ ] `poetry add langsmith` 실행
- [ ] `config.py`에 LANGSMITH_API_KEY 추가 (optional field)
- [ ] `.env.example`에 추가
- [ ] `pipeline.py`에 tracing 적용
- [ ] `poetry run pytest` → 기존 테스트 전부 PASS 확인 (tracing이 테스트를 깨지 않아야 함)
- [ ] commit

---

## Task 7: option_generation_service.py 교체 + 정리

**Files:**
- Modify: `app/post_draft/option_generation_service.py`
- Delete: `app/post_draft/voice_evaluator_service.py`
- Modify: `tests/unit/post_draft/test_option_generation_service.py`
- Modify: `tests/unit/post_draft/test_voice_evaluator_service.py`

**목적:** 기존 파일들을 새 pipeline으로 교체. 외부 API contract(router가 호출하는 `generate()` 함수 시그니처)는 변경하지 않는다.

**option_generation_service.py 변경:**
- 파일 내용 대부분 제거
- `from app.post_draft.generation_pipeline import pipeline`
- `generate()` 함수는 `pipeline.generate()`를 그대로 위임하는 얇은 wrapper

**voice_evaluator_service.py 삭제:**
- 삭제 전 이 파일을 import하는 곳 확인: `grep -r "voice_evaluator_service" apps/backend/app/`
- pipeline.py에서 직접 import하지 않고 voice_evaluator.py를 사용하는지 확인
- `test_voice_evaluator_service.py`는 이제 voice_evaluator.py를 테스트하도록 수정 (또는 삭제 후 test_voice_evaluator.py가 대체)

**기존 테스트 확인:**
- `tests/unit/post_draft/test_option_generation_service.py` — `generate()` 함수의 입출력 계약은 유지되므로 대부분의 테스트는 그대로 통과해야 함. mock 경로(patch target)만 업데이트 필요할 수 있음.
- `tests/integration/post_draft/test_post_draft.py` — router 레벨 integration test. 이것이 통과하면 교체 성공.

- [ ] `grep -r "voice_evaluator_service" apps/backend/app/` 실행해서 import 위치 전부 확인
- [ ] `option_generation_service.py`를 pipeline wrapper로 교체
- [ ] `voice_evaluator_service.py` 삭제
- [ ] `test_voice_evaluator_service.py` 업데이트 또는 삭제
- [ ] `test_option_generation_service.py` mock 경로 업데이트 (필요 시)
- [ ] `poetry run pytest` 실행 → 전체 PASS 확인
- [ ] commit

---

## 완료 기준

- [ ] `poetry run pytest` 전체 통과
- [ ] `tests/integration/post_draft/test_post_draft.py` 통과 (router contract 유지 확인)
- [ ] `poc_evaluator_comparison.py`가 여전히 실행 가능 (독립 스크립트, 영향 없어야 함)
- [ ] generation prompt 재설계로 인해 voice evaluator pass rate가 개선됐는지 LangSmith에서 확인 가능한 상태

## 이후 작업 (이 계획 범위 밖)

- Golden set 구축 (LangSmith experiment 설정)
- pass rate 측정 → N=5 필요 여부 결정
- SSE streaming 프론트엔드 연동
