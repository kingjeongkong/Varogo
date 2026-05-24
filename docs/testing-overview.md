# Backend Testing Overview

## 구조

```
tests/
  unit/
    auth/          — DB 없음, 함수 단위 테스트 (mock 사용)
    products/
    threads/
    post_draft/
    voice_profile/
  integration/
    auth/          — 실제 DB(varogo_test_db) + httpx AsyncClient로 HTTP 전체 흐름 테스트
    products/
    threads/
    post_draft/
    voice_profile/
    test_health.py
```

---

## 현재 커버리지 (FastAPI)

### Unit (77개)

| 파일 | 테스트 대상 | 주요 케이스 |
|---|---|---|
| `unit/auth/test_auth_dependency.py` | `get_current_user` dependency | 쿠키 없음 401, 잘못된 토큰 401, 유효 토큰 통과, claims 누락 401 |
| `unit/auth/test_security.py` | `hash_password`, `verify_password`, JWT | 해싱, 검증, 잘못된 비밀번호, JWT 생성/파싱 |
| `unit/auth/test_auth_service.py` | `signup`, `login`, `refresh`, `logout`, `get_me` | 이메일 중복 409, 비밀번호 없음/틀림 401, 토큰 invalid 401, 해싱 확인 |
| `unit/products/test_products_service.py` | `create`, `get_all`, `get_one` | analyze 실패→product 미생성, 없음 404, analysis null 처리 |
| `unit/threads/test_threads_crypto.py` | `encrypt_token`, `decrypt_token` | 라운드트립, nonce 랜덤성, 변조 감지 |
| `unit/threads/test_threads_service.py` | `generate_auth_url`, `_verify_state`, `_wait_for_container_ready`, `handle_callback`, `get_connection`, `disconnect`, `publish_to_threads`, `fetch_voice_units` | state 만료/변조 401, 폴링 상태별 분기, 타임아웃, 401 전파, permalink fallback, own-reply 병합 |
| `unit/post_draft/test_option_generation_service.py` | 순수 헬퍼 + `generate` | 실패 추출, 패치, 리트라이 성공/실패, evaluator 장애, 옵션 수 부족 500, retry 거부→fallback |
| `unit/post_draft/test_voice_evaluator_service.py` | `_parse_evaluation_response`, `evaluate` | 잘못된 개수/타입 500, 필터링, Gemini mock, todayInput 프롬프트 포함, Gemini 실패 500 |
| `unit/post_draft/test_post_draft_service.py` | `create`, `find_one_by_user`, `update_draft`, `publish_draft`, `list_drafts` | product/analysis/voice profile 없음, publish lock claim, rollback, nextOffset 경계값 |
| `unit/voice_profile/test_voice_analysis_service.py` | `analyze` | 구조 검증, 샘플 수 상한, 빈 응답 500, 호출 실패 500, 필드 누락 500 |
| `unit/voice_profile/test_voice_profile_service.py` | `import_from_threads`, `find_one` | 5개 미만 400, 신규 생성, 기존 업데이트 |

### Integration (77개)

| 파일 | 엔드포인트 | 주요 케이스 |
|---|---|---|
| `integration/auth/test_auth.py` | POST /auth/* | 회원가입, 로그인, refresh, logout, me |
| `integration/products/test_products.py` | GET/POST /products/* | 생성, 목록, 단건 조회, 소유권 |
| `integration/voice_profile/test_voice_profile.py` | POST /voice-profile/import, GET | import, upsert, 게시물 부족 |
| `integration/threads/test_threads.py` | GET/POST /threads/* | 연결, 해제, 퍼블리시 |
| `integration/post_draft/test_post_draft.py` | GET/PATCH/POST /post-drafts/* | 생성, 조회, 옵션 선택, 퍼블리시 |

---

## SQLAlchemy 단위 테스트 패턴

NestJS는 Prisma를 DI로 주입해 완전히 mock했다.
FastAPI는 `AsyncMock()`으로 `AsyncSession`을 mock한다:

```python
def _result(value=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    r.scalar_one.return_value = value
    return r

session = AsyncMock()
session.execute = AsyncMock(side_effect=[_result(v1), _result(v2)])
```

서비스 내부 함수(`_rotate_refresh_token`, `_wait_for_container_ready` 등)는 `patch()`로 직접 mock해서 복잡한 DB 체인을 단순화한다.
