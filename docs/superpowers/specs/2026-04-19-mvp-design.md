# Varogo MVP 설계 문서

- Date: 2026-04-19 (최신 갱신: 2026-05-03, Phase 1 종료 + varo-go.com 배포 완료, Phase 2 우선순위 재정렬)
- Status: Active
- 이 문서는 Varogo의 현재 정식 설계. 이전 설계 문서는 모두 폐기.

---

## 1. 제품 비전

**인디 개발자를 위한 Threads 마케팅 코파일럿.**

유저가 자기 제품 URL을 주면, AI가 제품을 이해하고 유저 보이스에 맞춰 매일 올릴 포스트를 같이 써준다. 마케팅 이론을 몰라도 쓸 수 있고, 반복적으로 쓸 수 있고, 시간이 갈수록 더 잘 맞춰진다.

### 차별점

**Product Analysis가 모든 콘텐츠 생성의 기반 지식으로 작동.** 유저는 "내 제품이 뭔지 이해하는 조력자"를 얻는다. Typefully / Postel은 빈 에디터에서 시작하고, 제품 도메인을 모르는 상태로 copywriting만 지원한다. Varogo는 **제품을 이미 아는 상태로 포스트 작성에 진입**한다.

---

## 2. 이 설계로 전환한 이유

이전 설계(Strategy cards + variationAxes + Template)는 2026-04-19 실험 사이클에서 구조적 한계가 확인되었다:

- **variationAxes(moment × emotion × time)가 narrative genre를 강제.** utility/B2B 제품 콘텐츠가 강제 1인칭 감성 서사로 흘러감. 도메인 편향을 프롬프트 튜닝으로 해결 불가.
- **moment axis가 activity phrase로 drift.** 7/8 제품에서 "during/while/after" 같은 활동 구간으로 나옴. 원래 의도한 "scene" 역할 못 함.
- **프롬프트 엔지니어링 diminishing return.** 3-4 iteration 거치면서 각 수정의 효과가 빠르게 줄어듦. flash-lite의 qualitative rule 무시 특성과 싸움.
- **카피라이팅 vs 서비스 방향 미스매치.** Strategy 카드 기반 설계는 AI가 모든 것을 생성하고 유저는 카드 하나만 선택. 실제 인디 메이커 워크플로우(voice가 이미 확립됨, 오늘 하고 싶은 얘기가 있음)와 맞지 않음.

**새 설계의 원리:** variation을 abstract primitive(axes)가 아니라 **실제로 다양한 입력**에서 얻는다:
- 유저의 실제 Threads voice → 도메인·성격별로 이미 다름
- Today input → 매 포스트마다 다른 오늘의 맥락
- Hook angle 다양화 → 유저가 3개 중 선택하며 창작에 개입

이 구조가 narrative 편향 문제를 자동 해결하고, 유저를 루프 안으로 가져온다.

---

## 3. 최종 Flow

### Part 1 — Onboarding (한 번, 5-7분)

```
회원가입
    ↓
Product Setup
  - URL + 기본 메타데이터 입력
  - AI 분석 (Dunford positioning)
  - 결과 확인 (편집은 launch 후)
    ↓
Threads 연결 + Voice Import
  - OAuth 연결
  - 최근 포스트 자동 fetch (text only)
  - Voice profile 추출 (한 번의 LLM 호출)
  - 결과 확인 (편집은 launch 후)
    ↓
[Dashboard 진입]
```

### Part 2 — Content Loop (매 포스트, 2-5분)

Post는 항상 특정 Product 컨텍스트 안에서 생성된다. 진입점은 Product 분석 페이지의 "+ New Post" 버튼.

```
[Product Analysis Page] → [+ New Post]
    ↓
Voice Gate (진입 시점 체크, step에는 포함 안 됨)
  - Threads 미연결    → "Connect Threads on integrations" 안내
  - Voice 없음        → "Import your voice" 버튼 (이 자리에서 import)
  - Voice 있음        → Step 1로 진입
    ↓
Step 1: Today's Input
  - "오늘 뭐 공유할까?" (optional, placeholder 예시 제공)
    ↓
Step 2: Hook Selection
  - AI가 3개 hook 제안 (서로 다른 angle, 라벨 표시)
  - 유저가 카드 선택(로컬) → 다른 카드 dim
  - "Save hook" 버튼 클릭 시 서버에 selectedHookId 저장
    ↓
Step 3: Body Completion & Edit
  - 선택한 hook 기반 본문 완성
  - 에디터에서 편집
  - 글자 수 카운터 (Threads 500자)
    ↓
Step 4: Publish
  - 즉시 발행 (Threads API)
  - 또는 Draft 저장
    ↓
[Product Analysis Page 복귀]
```

### Part 3 — Dashboard & Product Page

Dashboard는 **Product 허브**. Post 관련 UI는 해당 Product 페이지 안으로 이동한다.

```
[Dashboard]
  ├─ Products 리스트 (카드 그리드)
  │     └─ 각 카드 클릭 → /product/{id}/analysis
  └─ [+ Analyze New Product] 버튼

[/product/{id}/analysis]
  ├─ Product 요약 + Analysis 결과 (편집은 Phase 2)
  ├─ [+ New Post] 버튼 (Hero 우측 상단) → /product/{id}/post/new
  └─ Post List (Week 5-b)
      ├─ 탭: [Drafts] [Published]  — 목적이 달라 분리
      │    - Drafts: 항목 클릭 시 /product/{id}/post/new?draftId=X&step=hook 으로 resume
      │    - Published: 엔게이지먼트 요약(Phase 3에서 본격화) + permalink
      ├─ 정렬: updatedAt 최근순
      └─ 각 항목: 본문 미리보기 + 상태 + 선택된 angle 라벨

[/integrations]  — 외부 채널 허브 (Slice 2b에서 재설계)
  └─ Threads 카드 (타일 형태, 미래 채널 추가 대비)
      ├─ [icon] Threads
      ├─ [Threads 연동 / 해제]
      └─ [Voice 연동 / 연동됨 ✓] + ⓘ hover tooltip (기능 설명)
```

Voice 상세 정보(sampleCount / tonality 등)는 MVP에서 별도 표시하지 않는다 — "연동됨" 라벨로 충분. Phase 2의 편집 UI에서 상세·수정 노출.

---

## 4. 데이터 모델

### 신규 Prisma 스키마

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String?
  passwordHash  String?
  avatarUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts          Account[]
  refreshTokens     RefreshToken[]
  products          Product[]
  voiceProfile      VoiceProfile?
  threadsConnection ThreadsConnection?
}

// Account, RefreshToken, ThreadsConnection — 기존과 동일

model Product {
  id              String   @id @default(uuid())
  userId          String
  name            String
  url             String
  oneLiner        String
  stage           String
  currentTraction Json
  additionalInfo  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysis ProductAnalysis?
  posts    PostDraft[]

  @@index([userId])
}

model ProductAnalysis {
  id                   String   @id @default(uuid())
  productId            String   @unique
  category             String
  jobToBeDone          String
  whyNow               String
  targetAudience       Json
  valueProposition     String
  alternatives         Json
  differentiators      String[]
  positioningStatement String
  keywords             Json
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model VoiceProfile {
  id               String   @id @default(uuid())
  userId           String   @unique
  source           String   // "threads_import" (추후 "manual_paste", "seed_survey")
  sampleCount      Int
  styleFingerprint Json     // { tonality, avgLength, openingPatterns, emojiDensity, hashtagUsage }
  referenceSamples Json     // [{ text, date? }] — 프롬프트 주입용
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PostDraft {
  id             String    @id @default(uuid())
  productId      String
  todayInput     String?
  selectedHookId String?
  body           String
  status         String    // "draft" | "published"
  publishedAt    DateTime?
  threadsMediaId String?
  permalink      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  product     Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  hookOptions HookOption[]

  @@index([productId])
  @@index([status])
}

model HookOption {
  id          String   @id @default(uuid())
  postDraftId String
  text        String
  angleLabel  String
  selected    Boolean  @default(false)
  createdAt   DateTime @default(now())

  postDraft PostDraft @relation(fields: [postDraftId], references: [id], onDelete: Cascade)

  @@index([postDraftId])
}
```

### 제거되는 테이블

- `Strategy` — Angle Library 개념 자체를 없앰
- `StrategyContentTemplate` — 동일한 이유
- `Content` — `PostDraft`로 대체

---

## 5. MVP 범위

### MVP에 들어가는 것

**Backend (NestJS)**
- Auth (기존 유지)
- Product + ProductAnalysis 생성/조회 (편집 endpoint는 launch 후)
- Threads OAuth 연결 + 포스트 fetch (`GET /me/threads`, text only)
- Voice Profile 생성/조회 (편집 endpoint는 launch 후)
- PostDraft + HookOption CRUD
- Hook generation endpoint (LLM 호출, 3개 고정)
- Body completion endpoint (LLM 호출)
- Threads publish (기존 로직 유지)

**Frontend (Next.js)**
- Auth pages
- Onboarding: Product form → Analysis 확인 → (Threads 연결은 post flow 진입 시 유도) → Dashboard
- Dashboard: Products 그리드 + [+ Analyze New Product]
- Product Analysis page: Analysis 결과 + [+ New Post] + Post list (Week 5-b)
- New Post flow (`/product/[id]/post/new`): Voice gate → Today input → Hook selection → Body edit → Publish
- Integrations page: 외부 채널(Threads + 미래 채널) 연동 허브 — Threads OAuth + Voice import 한 타일 안에서 관리

**LLM 호출 지점 (4개)**
- Product Analysis (Gemini 유지)
- Voice extraction (OpenAI 또는 Gemini, 한 번 호출)
- Hook generation (OpenAI) — 3개, 서로 다른 angle, 라벨 포함
- Body completion (OpenAI) — hook + voice + product 반영

### MVP에서 빠지는 것

- **Product Analysis / Voice Profile 편집 UI** (launch 후 Phase 2에서 추가). Body는 New Post flow에서 그대로 편집 가능.
- Scheduling (즉시 발행만)
- Multiple products per user — **스키마는 1:N, UI는 1:1 enforce**
- Tracking / engagement 수집
- Product Analysis 진화 루프
- Hook 재생성 시 "최근 쓴 angle 피하기"
- Seed survey / manual paste (Threads 미가입자 대응)
- 결제 / Free vs Paid 분리
- 이메일 알림
- Team / multi-user

### MVP 원칙

1. Threads 연결은 **필수**. voice import를 위해.
2. **End-to-end loop가 먼저**. AI 결과 편집(steer) UI는 핵심 flow가 동작한 뒤 Phase 2에서 추가. Body 편집은 New Post flow의 핵심이라 예외.
3. Hook은 3개 고정. 필요 시 Phase 2에서 재생성 버튼 추가.
4. 각 Hook에는 **angle 라벨**이 붙는다 (유저 학습 + 미래 트래킹 대비).

---

## 6. Hook Generation 프롬프트

서비스 결과물 품질을 좌우하는 단일 지점. MVP 이후 이 프롬프트를 튜닝하는 게 제품 발전의 핵심.

```
=== Your Product ===
Category: {category}
Job to be done: {jobToBeDone}
Positioning: {positioningStatement}
Differentiators: {differentiators}
Alternatives: {alternatives}
Why now: {whyNow}
Keywords: {keywords}

=== Your Voice ===
Style: {styleFingerprint.tonality}
Typical length: {styleFingerprint.avgLength} chars
Usual opening patterns: {styleFingerprint.openingPatterns}
Emoji: {emojiDensity} | Hashtag: {hashtagUsage}

Here are 3 of your actual posts:
1. "{sample 1}"
2. "{sample 2}"
3. "{sample 3}"

=== Today's Context ===
{todayInput ?? "No specific update today. Draw from the product's positioning."}

=== Task ===
Generate 3 hooks for a Threads post (max 500 chars).

Each hook:
1. Matches the user's voice — same person writes all three
2. Takes a different angle from the others (no redundancy)
3. If today's context is given, anchors concretely to that fact
4. For each hook, label the angle in 2-3 words

Consider angles from these categories (pick 3 different ones):
- Story (personal narrative, failure, reflection)
- Contrarian (challenge a common belief)
- Data (specific number as hook)
- Positioning (unique category frame)
- Technical (builder's inside detail)

For each hook, the opening must fit the angle's structural pattern:
- Story → must contain one specific artifact (tool / number / named person or place) in the first 15 words
- Contrarian → must begin with "Most X" or "Everyone thinks Y" form
- Data → must begin with a specific number (not "many" or "most")
- Positioning → must begin by naming a category boundary
- Technical → must reference a specific mechanism (function / API / tool), not an abstract concept

Return JSON:
{
  "hooks": [
    { "text": "...", "angleLabel": "Failure → Success" },
    { "text": "...", "angleLabel": "Data Hook" },
    { "text": "...", "angleLabel": "Positioning" }
  ]
}

Rules:
- No AI-cliche openings ("Last summer, I was...", "Three days ago, I sat...")
- Emotion must show through word choice, never named directly
- If mentioning numbers, use the user's actual numbers from today's input, not invented
```

설계 주의점:
- `angle 카테고리별 구조 slot`을 **grammatical constraint로 지정** — flash-lite가 qualitative rule(cliche 금지)을 무시하는 특성을 우회.
- `angleLabel`은 카테고리 overlap 가능 (예: "Contrarian + Data"). MVP는 single label, Phase 3에서 primary + secondary 이원화 검토.

---

## 7. 구현 로드맵

### Phase 1 — MVP (4-5주)

> 원칙: end-to-end loop를 먼저 띄우고 launch한 뒤 steer/edit UI를 더한다. 각 주차의 "결과 편집" 류 작업은 Phase 2로 이전.

#### 진행 상황 (2026-04-23 갱신)

| Week | 상태 | 비고 |
|---|---|---|
| 1 | ✅ 완료 | PR #35 (코드 삭제), #36 (schema 교체 + init migration) |
| 2 | ✅ 흡수 | 별도 작업 없음 (편집 UI Phase 2 이전, 1:1 관계는 Week 1에서 처리) |
| 3 | ✅ 완료 | Backend PR #37. Frontend는 throwaway 회피 위해 Week 4로 이전 |
| 4a (backend) | ✅ 완료 | Hook generation + post-draft 모듈 + E2E 기반 품질 튜닝. PR #38 머지 |
| 4b-1 (frontend) | ✅ 완료 | voice-profile 모듈 + Dashboard 임시 노출. PR #39 머지. *VoiceProfileSummary는 Slice 2b에서 `/integrations`로 이전하며 Dashboard에서 제거.* |
| 4b-2a (full-stack) | ✅ 완료 | `features/post-draft/` + `/product/[id]/post/new` 페이지(진입 시점 voice gate + multi-step Today→Hook + Save 버튼 방식) + backend `PATCH`/`GET /post-drafts/:id` + AnalysisHero에 "+ New Post" 버튼. PR #40 머지 |
| 4b-2b (frontend) | ✅ 완료 | `/integrations` 재설계 (플랫폼 타일 카드 + Voice 연동 버튼 + ⓘ tooltip) + Dashboard에서 VoiceProfileSummary 제거. PR #41 머지 |
| 5-a (full-stack) | ✅ 완료 | Publish endpoint (PostDraft ↔ Threads) + hook-to-body copy on selection + idempotency 가드 + BodyEditor/PublishedPanel + PostFlowClient 4-step 확장. **Option A 피벗** (BodyCompletionService 폐기). PR #42 머지 |
| 5-b | ✅ 완료 | `/product/[id]/posts` 전용 페이지 + WAI-ARIA tablist + Flat list + Load more + publish 후 cache invalidation. 배치: **전용 페이지 + AnalysisHero `View Posts →` 버튼 진입**, 월별 그룹 미도입. PR #43 머지 |
| 6 | ✅ 완료 | PR #44 / #45 (publish reliability) + README (`f8b2b17` + `2390dd8` 데모/Meta App Review 안내) + `dev → main` 머지(PR #34, `aa262e2`) + varo-go.com 배포 |

---

**Week 1: 스키마 초기화 + 정리** ✅
- 기존 DB 전체 폐기 (프로덕션 유저 없음 전제, `prisma migrate reset` + 새 스키마)
- `Strategy`, `StrategyContentTemplate`, `Content` 관련 코드 / 라우트 / 페이지 모두 제거
- Auth, Prisma, LLM 모듈, ProductAnalysis, ThreadsModule은 재활용
- 진행 단위: ① 코드 삭제 → ② schema + service 교체 → ③ migrate reset (각 단계 별 PR)

**Week 2 (흡수)**: 별도 작업 없음 ✅
- Product + ProductAnalysis 생성/조회 + AI 분석 호출은 기존 코드 재활용
- 1:1 관계 정합화는 Week 1 ②에서 처리 완료
- 편집 endpoint / UI는 Phase 2로 이전

**Week 3: Threads 연결 + Voice Import** ✅ (Backend only)
- Backend (PR #37):
  - `ThreadsService.getUserVoiceUnits` — main + 본인 own-reply concat (threading 헤비 유저 voice 보존). main 25개 + 각 conversation fetch, conversation 실패 시 main only fallback
  - `VoiceAnalysisService` — deterministic stats (avgLength / emojiDensity / hashtagUsage) + Gemini `gemini-2.5-flash-lite` qualitative (tonality / openingPatterns / signaturePhrases)
  - `VoiceProfile` 모듈: `POST /voice-profile/import`, `GET /voice-profile`. 1:1 upsert. ≥5 voice unit 임계.
  - Schema v2: `signaturePhrases` 슬롯 추가 + 프롬프트 FORM vs CONTENT 분리. SET C(영어) / SET D(한국어) 합성 데이터로 4/5 signature 캐치 + form-only tonality 검증.
- Frontend는 Week 4로 이전 (`features/voice-profile/` 모듈은 어차피 hook gate에서 사용 → 임시 entry point UI 회피, 한 번에 본 위치에 구현). Week 3 종료 시점의 수동 테스트는 curl/Postman으로 `POST /voice-profile/import` 직접 호출 (OAuth는 기존 `/integrations` 페이지로 완료).

**Week 4a: Hook Generation Backend + 품질 튜닝** ✅ (PR #38 머지)

*완료 항목*
- **HookGenerationService** (`apps/backend/src/post-draft/hook-generation.service.ts`) — OpenAI `gpt-4o-mini` + Structured Outputs(`json_schema` 모드). `OPENAI_MODEL` env로 오버라이드 가능.
- **PostDraft 모듈** — `POST /post-drafts` endpoint. `{ productId, todayInput? }` → ownership + voice-profile 존재 검증 → Hook 3개 생성 → `$transaction`으로 PostDraft + HookOption[3] 원자 저장. Voice 미존재 시 400 (`Import your Threads voice first`).
- **frontend 타입 미커밋** — `new-endpoint` skill 규칙상 `lib/types.ts` 동기화 대상이지만 실 consumer 없는 dead type이라 Week 4b에서 실제 사용처와 함께 커밋 예정.

*E2E 기반 품질 튜닝 (2026-04-20 실행)*
- **테스트 매트릭스**: 4 products (linkody / submit-diy / gymstreak / senja) × 2 voices (en-operations-analyst / ko-product-planner) × 2 modes (null todayInput / 주입 todayInput) = 48 hook. 결과물은 `docs/hook-e2e-baseline/`에 MD + JSON.
- **T1 자동 메트릭 스위트** (`apps/backend/src/scripts/hook-metrics.ts`, 미커밋) — 6개 순수 함수:
  - `openingPatternMatch`, `signaturePhraseUsed`, `invertedNumberPresent`
  - `forbiddenTokensHit` (! / game changer / AI-cliche opener / 이모지 / 여러분)
  - `angleOpenerMismatch`, `todayInputEchoRatio`
- **T2 서비스 재작성** (commit `ff485fe`):
  - 프롬프트 우선순위 명시: voice opening pattern ≥ 2/3 > forbidden habits > signature phrase 원뜻 보존 > angle shape > todayInput
  - todayInput = "raw material, not narrative spine" 구조 규칙 (예시 없이)
  - todayInput 비어있으면 Data angle 차단, 통계 발명 금지
  - `computeFormattingStats` (! 빈도, em-dash, bullet, all-caps, 평균 문단 길이) — referenceSamples에서 즉석 계산, 스키마 변경 0
  - `findVoiceViolations` + retry 루프 (최대 2회, 총 3회 호출) — regex로 deterministic 차단

*메트릭 결과*

| 지표 | T1 Baseline | T2 적용 후 |
|---|---|---|
| opening_pattern_match | 2.1% | **87.5%** |
| signature_phrase_used | 64.6% | 70.8% |
| inverted_number_present | 41.7% | **4.2%** |
| forbidden_tokens (합계) | 5건 | **0건** |
| today_input_echo_avg | 0.025 | 0.028 |
| angle_opener_mismatch | 10.4% | 31.3% (voice 우선 설계의 예상된 trade-off — 메트릭 재정의 대상) |

*Ship 판단*: 3-hook 중 1개 선택 + body 편집 UX 전제상 현재 품질은 ship 가능. 잔여 이슈(signature phrase 29% 공백, 일부 한국어 비문)는 Phase 2 튜닝으로 이전.

**Week 4b**: Frontend voice-profile + New Post flow. 변경면이 커서 3개의 slice로 분리.

**Week 4b-1: voice-profile 모듈 + Dashboard 임시 노출** ✅ (PR #39 머지)
- `features/voice-profile/`: api-client, `useVoiceProfile` / `useImportVoice` hooks, `VoiceProfileSummary` 컴포넌트
- `src/hooks/use-threads-connection.ts`: `useThreadsConnectionStatus`를 공용 read hook으로 분리 (cross-feature import 회피). action 훅은 `features/threads/`에 유지
- Dashboard에 `VoiceProfileSummary` 임시 배치 — Slice 2b에서 `/integrations`로 이동하며 Dashboard에서 제거 예정
- 테스트 21 cases 통과

**Week 4b-2a: Post flow + backend update endpoints** ✅ (PR #40 머지)
- Backend:
  - `PATCH /post-drafts/:id` — `body` / `selectedHookId` 부분 업데이트. ownership은 Prisma nested where(`product: { userId }`)로 검증. `HookOption.selected`는 저장하지 않고 response 변환 시 `h.id === draft.selectedHookId`로 computed.
  - `GET /post-drafts/:id` — draft + hooks 재조회. 새로고침/복구 + URL 쿼리 기반 resume에 사용. ownership 동일 패턴.
- Frontend:
  - `features/post-draft/`: api-client, `useCreatePostDraft` / `useUpdatePostDraft` / `usePostDraft` hooks
  - `lib/types.ts`에 `PostDraftResponse`, `HookOptionResponse` 추가
  - `/product/[id]/post/new` — **단일 페이지 multi-step**. state 전환으로 Step 1 ↔ Step 2 UI 교체. 페이지 이동 없음.
    - **진입 시점 voice gate** (step에는 미포함): Threads 미연결 → `/integrations` 링크 안내 / voice 없음 → 인라인 import 버튼 / voice 있음 → Step 1 시작
    - Step 1: Today input (textarea + 글자수 카운터). **placeholder에 수치/artifact 예시 포함 + 빈칸 제출 시 soft warning** — Data Hook 품질의 단일 최대 지렛대 (T1 E2E 근거). Submit 시 `POST /post-drafts` 호출 → 성공 후 `router.replace('?draftId=${id}&step=hook')`로 URL 쿼리에 상태 반영
    - Step 2: Hook selection — 3개 hook 카드 + angle 라벨. 카드 클릭 = **로컬 선택**(시각 강조 + 나머지 카드 dim). 하단 **"Save hook" 버튼 클릭 시** `PATCH /post-drafts/:id`로 selectedHookId 저장. 저장 완료 시 "Draft saved. Body editor coming soon." 안내 + Product 페이지 복귀 링크. Step 3 Body editor는 Week 5. (초기 "즉시 PATCH" 설계에서 유저가 3개 hook을 비교·재고할 여유가 부족하다는 피드백으로 Save 버튼 방식으로 전환.)
    - **URL 쿼리 복구**: 진입 시 `?draftId=...&step=hook`이 있으면 `usePostDraft(draftId)`로 재조회 → 성공 시 Step 2로 바로. draftId가 잘못됐거나 타인 소유(404)면 쿼리 무시하고 Step 1으로 fallback (UX 부드럽게). 새 기기/탭에서 URL 공유로 resume 가능.
  - `/product/[id]/analysis`의 AnalysisHero 우측 상단에 "+ New Post" 버튼 추가. 하단 dead "Choose Strategy" CTA 블록 제거 (`strategies` 라우트 Week 1에서 삭제됨).

**Week 4b-2b: Integrations 허브 재설계 + Dashboard 정리** ✅
- `/integrations` 페이지를 **플랫폼 타일 카드** 패턴으로 재작성:
  - 카드 구조 (세로 스택): `[플랫폼 아이콘] [플랫폼 이름]` + Connection row + Voice row
  - Threads 카드: `[Threads 연동/해제]` + `[Voice 연동 / Imported ✓]` + ⓘ Radix tooltip (Voice 기능 설명)
  - **Voice row 가시성**: Threads 미연결 시 Voice row **숨김**(disabled 아님). Threads 연결 시 렌더 — 원 설계의 "disabled + 안내"에서 더 단순한 숨김으로 변경
- Dashboard의 `VoiceProfileSummary` 제거 — Voice 상태 확인은 `/integrations`에서만. 컴포넌트 + 테스트 파일까지 삭제(dead code 미잔존)
- 구현 상세:
  - `apps/frontend/src/components/ui/Tooltip.tsx` — `@radix-ui/react-tooltip` 얇은 래퍼
  - `apps/frontend/src/app/integrations/ThreadsTile.tsx` — 상태 매트릭스(loading/error/미연결/연결+voice없음/연결+voice있음/voice loading/voice error) 전담
  - 타일 그리드: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (ProductList와 동일 breakpoint)
  - Tooltip/ThreadsTile 각 테스트 파일: 37개 케이스 추가. 전체 168/168 pass
- Voice 상세 정보(sampleCount / tonality 등)는 MVP에서 표시하지 않음 — "Imported ✓" 라벨로 충분. Phase 2의 편집 UI에서 상세 노출 (modal 후보)

**Week 5-a: Body editor + Publish (컨텐츠 루프 closure)** — **Option A 피벗**

> **설계 피벗 (2026-04-21)**: 원래 "hook = 짧은 opener + body = AI 확장(BodyCompletionService)" 전제였으나, 실제 hook generation 결과가 300-440자 **거의 완성형 post draft**임이 드러나 설계 불일치. Option A로 전환 — hook 저장 시 hook text를 `draft.body`로 복사, 유저는 Step 3 editor에서 편집만, 별도 body 생성 LLM 호출 없음. LLM 호출 2회 → 1회, voice 재현 실패 지점 단순화.

**Week 5-a-1 (backend)** ✅ (PR #42 머지)
- Publish endpoint `POST /post-drafts/:id/publish { body }` — PostDraft 도메인
  - `ThreadsService.publishToThreads(userId, body)` 호출 → 성공 시 DB 일괄 update (`status='published'`, `publishedAt`, `threadsMediaId`, `permalink`, `body`)
  - **Idempotency 가드**: `status === 'published'` 체크 시 `ConflictException` (중복 발행 방지)
  - body 단독 전송 (hook concat 없음, hook은 이미 body에 복사된 상태)
  - DTO: `@Length(1, 500)` — Threads 500자 한도는 DTO에서 차단
- `PostDraftService.update()` 수정 — `selectedHookId` PATCH 시 `draft.body === ''`이면 선택된 hook의 text를 body로 자동 복사 (atomic single update)
- `PostDraftResponse`에 `publishedAt`, `threadsMediaId`, `permalink` 노출
- E2E 검증 (2026-04-21, 실 Threads 계정 `@varo.gogo` 발행 성공) — 이 E2E에서 관찰된 비결정적 400 실패가 Week 6 PR #44로 이어짐

**Week 5-a-2 (frontend)** ✅ (PR #42 머지, 5-a-1과 단일 PR로 묶어 배포)
- `BodyEditor.tsx` 신규 — `draft.body`(hook copy) 기반 textarea + 500자 카운터 + Publish 버튼. **auto-generate 로직 없음**. "Review your post" 헤딩으로 편집 유도. `disabled={mutation.isPending}`로 더블클릭 차단
- `PublishedPanel.tsx` 신규 — `status='published'` 뷰. body preview + `permalink` 외부 링크("View on Threads ↗") + Back to product
- `PostFlowClient.tsx` 확장 — `resolveStep()` 도입, step `'today' | 'hook' | 'body' | 'done'`, 각 step당 독립 컴포넌트 통째 교체
- `HookSelection.tsx` 단순화 — `hasSelection` 분기 + "Body editor coming" placeholder 전체 제거. hook 선택 전담
- `PostDraftResponse`에 `publishedAt`/`threadsMediaId`/`permalink` 필드 추가
- `publishPostDraft` api-client + `usePublishPostDraft` hook 신규
- 테스트: BodyEditor 12 cases + PublishedPanel 6 cases + 기존 HookSelection 재정비. **총 177/177 pass**

**Week 5-b: Post list (Drafts/Published 탭)** ✅ (PR #43 머지)

- Backend
  - `GET /post-drafts?productId&status&limit&offset` — ownership-filtered, `{ items, nextOffset, total }` 응답. `prisma.$transaction([findMany, count])`로 page-total 드리프트 방지. 9 unit test (ownership / sort / pagination / nextOffset 경계 / hookOptions include)
- Frontend
  - `/product/[id]/posts` 전용 라우트 신설. `AnalysisHero`에 `[View Posts →]` secondary 버튼 추가 (`[+ New Post]` 옆)
  - `PostsTabs` — WAI-ARIA tablist (roving tabIndex, ArrowLeft/Right/Home/End 키보드). URL `?tab=drafts|published`를 `router.replace({ scroll: false })`로 동기화 — deep-link / refresh 복원
  - `PostsListClient` — `useInfiniteQuery` 단일 활성 탭만 fetch. UI plural(`drafts`) → backend singular(`draft`) 매핑 로컬에서 처리. 4 mutually exclusive states (loading / error / empty / populated) + Load more
  - `DraftCard` — 카드 전체가 `<Link>` (resume URL). `PublishedCard` — `<article>` + 내부 permalink만 클릭 가능 (Phase 3 engagement 상세 확장 대비)
  - publish 성공 시 `['post-drafts-list', productId]` prefix invalidate로 양 탭 동시 refetch
- **배치 결정**: 당초 후보 (analysis 하단 vs 별도 페이지) 중 **별도 페이지** 채택. 이유: Phase 3 engagement 대시보드 진화 경로와 정합, Analysis 페이지 밀도 유지
- **미도입 (Phase 2/3로 이연)**: 월별 그룹 헤더, Draft 삭제, engagement 숫자, 양 탭 동시 count

**분할 이유**: 5-a만 끝나도 end-to-end content loop가 닫혀 실사용 테스트 가능. Post list는 "이미 발행된 것들 관리"라 루프 closure 이후 별개 가치. 한 PR에 묶으면 리뷰면 크고 실사용 feedback 지연됨.

**Week 6: Publish reliability + 배포 준비** 🔄

Meta review 진행 중인 상태라 `main` merge는 보류하고 `dev`에 누적. Week 6 범위도 "배포" 자체가 아니라 "배포 직전 publish path 안정화"로 조정 (spec §7 Week 6 원본의 A/B·cliche 자동 감지 항목은 실 유저 데이터 쌓인 뒤가 의미 있어 Phase 2로 이연).

**Week 6-a (backend): Threads publish container status 폴링** ✅ (PR #44 머지)
- `ThreadsService.publishToThreads`는 container 생성 직후 즉시 `threads_publish`를 호출하고 있어 Meta의 비동기 처리가 덜 끝난 상태(`IN_PROGRESS`)에서 발행을 시도하면 400 반환. 짧은 본문은 대부분 통과하지만 긴/한국어 본문에선 비결정적으로 실패. Week 5-a-1 E2E 때 최초 재현, PR #44 전 E2E에서도 `IN_PROGRESS` 상태 직접 관찰.
- **구조**: container 생성 직후 `GET /{container-id}?fields=status,error_message` 폴링으로 `FINISHED` 대기 후 publish. **Poll-first + 1s → ×1.5 backoff (cap 3s), 전체 10s deadline**. `ERROR` / `EXPIRED` 터미널 상태는 즉시 유저 노출 메시지로 throw, 네트워크 blip/비-2xx는 warn + 다음 iteration 재시도.
- 상수 3개(`POLL_INITIAL_DELAY_MS=1000`, `POLL_MAX_DELAY_MS=3000`, `POLL_TIMEOUT_MS=10_000`) + private `sleep` / `fetchContainerStatus` / `waitForContainerReady` 메서드 추가. 단위 테스트 16개 신규 (fetchContainerStatus 5 + waitForContainerReady 9 + publishToThreads 통합 2).
- 유저 노출 에러 메시지 3개 리라이트 (`BodyEditor.tsx:71`의 `<Alert>{mutation.error.message}</Alert>` 경로로 그대로 표시되므로 프론트 변경 0): container 생성 실패 / ID 누락 / publish 실패 문구 모두 user-friendly 문장으로 교체.
- **E2E (2026-04-22)**: `@varo.gogo` 테스트 계정에 3회 발행. 그중 1회에서 Poll #1 `IN_PROGRESS` → 1s 대기 → Poll #2 `FINISHED` → 성공 흐름 직접 재현. 3개 포스트 전부 Threads feed 노출.

**Week 6-b (backend): Publish optimistic lock** ✅ (PR #45 머지)
- Week 5-a-1의 `status === 'published'` 체크는 read-then-check 구조라 동시 요청 2개가 둘 다 `'draft'`를 읽고 통과 → 둘 다 Threads API 호출 → **유저 Threads에 중복 포스트 노출**. 프론트엔드 `disabled={mutation.isPending}` 가드는 단일 탭 더블클릭만 막아 UX 힌트 수준.
- **구조 (Option B)**: `updateMany({where: {id, status:'draft', product:{userId}}, data:{status:'published'}})`로 **원자 claim**. count 0이면 이미 published거나 다른 요청이 앞섰다는 뜻이라 `ConflictException`. Claim 성공 시 Threads 호출 후 `body/publishedAt/threadsMediaId/permalink` 채움. Threads 실패 시 `status`를 `draft`로 rollback해 유저 재시도 가능. **중간 상태(`publishing`) 없이 2-state 유지** — 구현 단순화, claim 직후 ~1-2s 동안 `status='published'`인데 metadata 빈 window가 존재하지만 MVP 규모에서 수용 가능.
- 스키마 변경 0, 프론트 변경 0, env var 변경 0. 단위 테스트 6개 (happy path / null permalink 전파 / NotFoundException / lock 충돌 시 ConflictException / selectedHookId 없을 때 BadRequestException / Threads 실패 시 status rollback). 전체 backend suite 139 pass.
- 참고: 이 PR의 "Option B" 명명은 후보 A(중간 `publishing` 상태 + 전이 3단계, 정석) vs B(`draft → published` 직접 + rollback, 단순) 중 단순형을 채택했음을 표시. A는 Phase 2 이후 규모 확대 시 재검토 후보.

**Week 6-c: README 최소 정리** ✅ (`f8b2b17` + `2390dd8`)
- 루트 `README.md`에 제품 한 줄 + stack + "Status: MVP, Meta App Review in progress" + 데모 영상 + 외부 접근 제한 안내 추가.

**Week 6-d: `dev → main` merge 및 varo-go.com 배포** ✅ (PR #34, `aa262e2`)
- `dev → main` 머지 후 자동 배포 파이프라인(EC2/RDS/Vercel) 실행. CI 보강으로 `234e40a` (prisma migrate fail-fast) 추가.
- 배포 후 추가로 머지된 운영 하드닝: PR #46 (voice evaluator hybrid agent loop, 기존 regex retry 대체), PR #47 (sidebar nav + (app)/(public) 라우트 그룹), PR #48 (feature public API barrel 패턴), 그 외 직접 main 커밋 다수 (a11y / 에러 핸들링 / cancel-aware mutation / LLM 30s 타임아웃 / threads 폴링 auth·rate-limit 분기 등).
- 외부 접근은 Meta App Review 진행 중이라 README의 안내문구로 명시.

**이월 (Week 6 원본 → Phase 2 또는 후속)**
- Voice 있음/없음 A/B — 실 유저 데이터 후 (Phase 2 이연)
- AI-cliche 자동 regression (`hook-metrics.ts` CI 통합) — Phase 2 이연 (PR #46 hybrid agent loop과 역할 분담 재정의 필요)
- Hook 길이 압축 / 한국어 품질 / `gpt-4.1-mini` A/B — **Phase 2 재평가 결과 모두 이연** (실유저 신호 필요, §Phase 2 참조)
- Terminology cleanup (`HookOption` → `PostDraftOption`) — **Phase 2 슬라이스 1로 격상 + UI 어휘까지 확장** (§Phase 2 참조)

### Phase 2 — 품질 개선 (MVP 런칭 후)

> **재정렬 (2026-05-03)**: Phase 1 종료 후 Flow 검토를 통해 Phase 2 우선순위를 재구성. Flow B(opener-first 2-step) / C 후보들을 7축 비교한 결과 **Flow A 유지가 옳다**고 판단 — 자세한 근거는 §확정된 의사결정. A의 약점(3개 다 별로일 때 회복 / authorship 감)은 *flow 변경*이 아니라 *어휘 정합 + 부분 regenerate*로 해결.

#### 슬라이스 1 — 터미놀로지 / 어휘 일괄 정리 (1순위)

내부 명명 + UI 어휘를 동시에 모델에 맞춤. 현재 코드는 `HookOption` / `selectedHookId` / `HookGenerationService`를 쓰지만 Option A 피벗 후 실제 생성물은 **full post draft option**이고, UI 카피("Choose a hook" / "Each hook takes a different angle")가 이미 어휘-모델 미스매치를 자백. 미래 진짜 opener-only hook 기능 도입 시 collision은 코드뿐 아니라 *유저 어휘*에서도 발생. 지금이 마이그레이션 비용 최저점.

- DB: `hook_options` → `post_draft_options`, `selected_hook_id` → `selected_option_id` 마이그레이션
- 백엔드: `HookOption` / `HookGenerationService` / `generateHooks` / 파일·DTO·타입 일괄 리네임
- 프론트 내부: `HookOptionResponse` / `selectedHookId` / `step==='hook'` / `HookSelection.tsx` / `data-hook-id` 일괄 리네임
- UI 카피: "hook" 사용처 ~10–15곳 → **"angle"** ("Choose a hook" → "Choose an angle", "Save hook" → "Save angle", "Generate hooks" → "Generate angles", aria-label, placeholder, gate 안내문)
- URL 쿼리: `?step=hook` → `?step=angle` (외부 링크 거의 없는 시점이라 안전)

**어휘 매핑 (3-vocabulary 분리, 2026-05-03 확정)**:

| 레이어 | 어휘 | 비고 |
|---|---|---|
| DB / Prisma 모델 / 컬럼 | `PostDraftOption`, `post_draft_options`, `selected_option_id` | 명시적 prefix |
| 백엔드 **클래스 + 익스포트 타입** | `PostDraftOptionGenerationService`, `PostDraftOptionGenerationInput`, `GeneratedPostDraftOption`, `PostDraftOptionGenerationResult`, `PostDraftOptionAssessment`, `PostDraftOptionEvaluation` | **DB 모델명과 prefix 통일** — "option"만으론 generic해서 다른 도메인 충돌 / 미래 확장 시 모호함 |
| 지역 변수 / 메서드 / 파라미터 | `firstOptions`, `assessOptions()`, `option`, `options` | 타입 시그니처가 명시적 이름을 담고 있어 redundant 회피 |
| LLM 프롬프트 본문 + JSON 스키마 필드 | `option`, `options`, `perOptionFeedback`, `optionIndex` | LLM-facing 어휘 (TypeScript 명명과 별개, 프롬프트 가독성 우선) |
| 유저 노출 UI 카피 / 컴포넌트명 / URL 쿼리 | `angle`, `Angle`, `angles` | 마케팅 친화 어휘 |
| `angleLabel` 데이터 필드 | **변경 없음** | 이미 정확한 이름 |

근거: 어휘를 모델에 맞추면 인지부하가 줄고, 미래 진짜 hook(=opener) 기능 도입 시 `Angle ─ Hook ─ Body` 3-tier로 깔끔하게 확장됨.

#### 슬라이스 2 — 부분 regenerate (2순위)

Flow A의 진짜 약점("3개 다 별로일 때 회복" + authorship 감)을 직접 타격. 원 doc의 "Hook 재생성 버튼 (최대 2회 추가, 누적 5개까지)"에서 누적 5개는 over-engineering이라 **선택된 것 외 N개만 다시** 형태로 단순화.

- 백엔드: 선택된 option(들) 외 나머지 N개만 재생성 endpoint (e.g. `POST /post-drafts/:id/options/regenerate { keepIds: string[] }`). 기존 retry prompt의 `Approved hooks (DO NOT regenerate)` 블록을 재활용 — 인프라 이미 있음.
- 프론트: 카드별 ↻ 버튼 또는 "다른 안으로" 버튼.
- rate-limit: 포스트당 누적 N회(예: 3회) 캡 — 비용 폭주 방지.

#### 슬라이스 3 — Steer / Edit UI (3순위, Phase 1 이월)

AI가 틀렸을 때 유저의 escape hatch. Meta App Review 통과 후 외부 유저 유입 시 trust 토대로 필수.

- ProductAnalysis 편집 — scalar / string[] 필드 우선 (`positioningStatement`, `jobToBeDone`, `whyNow`, `valueProposition`, `category`, `differentiators`). 중첩 JSON 필드(`targetAudience`, `alternatives`, `keywords`)는 실제 유저 요청 시 추가
- Product 편집 (`name`, `url`, `oneLiner`, `stage`, `currentTraction`, `additionalInfo`)
- VoiceProfile 편집 (`styleFingerprint` 일부 — `tonality` / `openingPatterns` 우선)
- 편집 시 자동 재분석 없음 — 수동 override만

#### 슬라이스 4 — Engagement 트래킹 (4순위)

차별화 가치, 단 실유저 데이터 쌓인 후 본격화. 본격 진입 시 별도 brainstorm 사이클 필요 (스코프 큼).

- 신규 모델 `PostEngagement` (impressions / likes / replies / reposts / fetchedAt)
- Threads Insights API 연동 (별도 OAuth scope 사전 확인 필요)
- 폴링 vs on-view fetch 전략 결정 필요
- Dashboard / Posts 페이지에 발행 포스트별 숫자 표시
- "최근 잘 된 angle" 간단 통계 (Phase 3 추천 루프의 첫 발)

#### 선택 enhancement — Today input angle 선호

Flow B의 *유저 authorship 감*을 LLM 호출 / 스키마 변경 없이 흡수.

- `TodayInputForm`에 라이트 라디오 추가 (5개 angle 중 0–2개 선호 표시)
- `CreatePostDraftDto.preferredAngles?: string[]`
- 프롬프트에 "Prefer these angles if natural" 주입
- 데이터 모델 변경 0, LLM 호출 추가 0

슬라이스 1·2와 묶거나 별도 작은 슬라이스로 처리. 필수 아님.

#### 이연 — 실유저 데이터 후 재평가

원 Phase 2 / Week 6 이월 항목 중 데이터 의존도가 높은 것들. 모두 Meta App Review 통과 + 유저 2–3명 사용 후 재평가.

- **Hook 길이 압축**: 기존 근거(Week 4b-2a 5–7문장 / Week 5-a-1 439자·9문장 관찰)는 4개 합성 voice 기반. voice import 시 `avgLength`가 프롬프트에 주입되므로 유저 voice가 짧으면 자연 압축됨. 실유저 신호 들어오면 1-line 튜닝(`max sentences: N` / `findVoiceViolations`에 `sentenceCount > N` regex)으로 처리 — Phase 2 슬롯 차지할 작업 아님.
- **`gpt-4o-mini` → `gpt-4.1-mini` A/B** (한국어 품질). 정량 비교에 실유저 데이터 필요.
- **Voice-specific few-shot** — voice import 시 hook 예시 2–3개 생성·저장 후 hook-gen 프롬프트에 주입. PR #46의 evaluator agent loop으로 voice fidelity가 한 단계 강화됐으므로 우선순위 낮춤.
- **Signature phrase 의미 주석** (`Array<{phrase, usage}>`) — Week 4a 관찰("the constraint is the feature" 원뜻 파괴) 근거. 실유저 빈도 후.
- **Voice 있음/없음 A/B** (Week 6 원본 이월).
- **AI-cliche 자동 regression** (`hook-metrics.ts` CI 통합) — 정기 배치 또는 CI 통합. PR #46 hybrid agent loop과의 역할 분담 재정의 필요.
- **`angleOpenerMismatch` 메트릭 재정의** — voice 우선 설계의 의도적 slot 위반을 regression으로 오탐. 1–2시간 작업, 정식 슬롯 아님 — 프롬프트 튜닝 사이클에 끼워넣기.
- **Week 5-a-1 E2E hook 품질 관찰** (`"X isn't Y, it's Z"` / `"It turns out..."` / `"I'm convinced..."` 같은 generic 오프너, 439자/9문장 길이) — 슬라이스 1·2 완료 후 실유저 데이터로 재관찰.

### Phase 3 — 차별화 (4-6주, 유저 확보 후)

**트래킹 → 추천 루프**
- Engagement 데이터 기반 hook 생성 개선
- 유저별 "이 angle이 당신한테 먹힘" 학습
- Hook 제안 시 과거 성과 반영

**Product Analysis Evolution**
- 유저가 자주 편집하는 필드 감지
- 반응 좋은 포스트에서 새 키워드 추출 → positioning 수정 제안
- "지난 달 대비 어떤 각도가 강해졌나" 인사이트

**Seed voice / paste 경로**
- Threads 계정 신규 유저 대응
- 3-4 질문 기반 voice profile 초기값

### Phase 4 — 수익화 (필요 시점)

**Free vs Paid 경계**
- 월 발행 수 제한 (Free: 5개, Paid: 무제한)
- Voice profile 고도화 (Paid 전용)
- Engagement 분석 (Paid 전용)
- Multiple products (Paid 전용)

**결제 연동** (Stripe 또는 Lemon Squeezy)

---

## 8. 확정된 의사결정

| 질문 | 결정 |
|---|---|
| 기존 DB 전체 폐기 | YES — 프로덕션 유저 없음, `prisma migrate reset` |
| Product 1:1 vs 1:N | **스키마는 1:N, MVP UI는 1:1 enforce**. Paid 단계에서 해제 |
| Hook 개수 | **3개 고정**. Phase 2에서 재생성 버튼 도입 |
| Threads import — text vs engagement | **text only**. engagement scope는 Phase 3에서 재동의 |
| Week 1 PR 전략 | **단일 PR로 대청소 + 새 스키마**. 중간 상태가 깨짐 상태라 분리는 위험 |
| Flow 구조 (2026-05-03) | **Flow A 유지** — opener-first 2-step(B), outline-first(C3), 대화형(C2), 부분 regen만 추가(C5) 등 후보를 인지부하 / authorship / time-to-publish / LLM 비용 / voice 일관성 / 회복력 / onboarding 직관성 7축 비교 결과. A의 약점(3개 다 별로일 때 회복 / authorship 감)은 부분 regenerate + 어휘 정합으로 해결 |
| Terminology cleanup 옵션 (2026-05-03) | **옵션 (a) + UI 어휘 동시** — 내부 `HookOption` → `PostDraftOption` 리네임뿐 아니라 유저 노출 "hook" → "angle"까지 함께. 어휘-모델 미스매치 영구화 회피 |
| 클래스/타입 prefix 정책 (2026-05-03) | **익스포트 타입과 클래스는 `PostDraftOption*` 명시적 prefix 사용** — `OptionGenerationService` 같은 짧은 form은 generic("option"이 다른 도메인과 충돌 가능)이라 비채택. 폴더 컨텍스트만 의존하는 `voice-evaluator.service.ts → VoiceEvaluatorService` 패턴은 고유 개념일 때만 작동. 지역 변수·메서드·LLM 프롬프트·JSON 필드는 짧은 form 유지(타입 시그니처가 explicit 이름을 담음) |
| LLM 프롬프트 + JSON 스키마 scope (2026-05-03) | **모두 "option" 어휘로 리네임** — 프롬프트 본문(`Generate 3 options`, `Approved options`, `Options to fix` 등) + OpenAI Structured Outputs 스키마 필드명(`hooks: []` → `options: []`) + Gemini voice evaluator 스키마(`perHookFeedback` → `perOptionFeedback`, `hookIndex` → `optionIndex`) 모두 변경. 코드-프롬프트 어휘 일관성 우선, 출력 톤 변동은 한 번 sanity 호출로 검증 |
| Hook 길이 압축 (2026-05-03) | **이연** — 기존 근거가 합성 voice 기반. voice import 시 `avgLength` 주입으로 자연 압축. 실유저 신호 후 1-line 튜닝(프롬프트 `max sentences` / regex 추가)으로 처리 |

---

## 9. 이 설계가 풀지 않는 것 (알려진 한계)

- **Threads 연결 필수 = 강한 온보딩 필터.** Threads 계정 없는 유저는 앱 못 씀. Phase 3 seed survey 경로가 보완하지만 MVP 초기에는 TAM 제약.
- ~~**Voice extraction 프롬프트 untested.**~~ Week 3 PR #37에서 SET C/D 합성 데이터로 검증 완료. 실제 유저 데이터로는 Week 6 A/B 실험에서 재평가.
- **LLM의 qualitative rule 무시 (gpt-4o-mini 관찰 확인).** "AI-cliche 금지", "voice opener 사용" 같은 규칙은 프롬프트 우선순위만으론 100% 보장 불가. Week 4a에서 **post-generation regex filter + 최대 2회 retry**로 우회 (hook-generation.service.ts의 `findVoiceViolations`). 2026-04-27 PR #46에서 regex retry를 **Gemini 기반 hybrid agent loop (`VoiceEvaluatorService`)** 으로 교체 — semantic mismatch(원뜻 재조립 등) 감지가 한 단계 향상. 현재는 cliche pre-filter(deterministic regex)와 voice evaluator(LLM 판단)가 역할 분담. 추가 보강은 실유저 데이터 후.
- **한국어 생성 품질.** gpt-4o-mini는 한국어 in-context generation에서 일부 비문·영어 단어 혼입("INGREDIENTS:" 류) 발생. Phase 2에서 gpt-4.1-mini A/B 후보.
- **Hook generation 비용.** 포스트당 Hook 3개 + Body 1개 = 4 LLM call. retry 루프 도입으로 worst-case 3x → ~12 call까지. 실전 평균은 1.2-1.5x 예상. 무료 유저 남용 방지 정책(Phase 4) 필요할 가능성.
- **`angleOpenerMismatch` 메트릭 한계.** voice 우선 설계가 의도적으로 angle slot을 위반하는 케이스를 regression으로 오탐. Phase 2 재정의 대상.
- **Publish claim window (Week 6-b Option B trade-off).** `draft → published` 원자 claim 직후 Threads 호출이 끝나기 전 ~1-2s 동안 `status='published'` 이면서 `threadsMediaId` / `permalink` / `publishedAt`이 null인 window가 존재. 이 찰나에 동일 draft를 GET으로 조회할 확률은 MVP 규모에서 사실상 0이라 수용. 규모 확대 시 중간 상태(`publishing`) 재도입 또는 `publishedAt`을 claim 시점에 provisional하게 셋팅하는 옵션으로 보강 가능.

위 한계는 MVP 블로커가 아니고 모두 **관찰 후 대응** 대상.
