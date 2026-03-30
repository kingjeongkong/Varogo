# Varogo

인디 개발자를 위한 X(Twitter) 마케팅 전략 SaaS.
제품 분석 → 마케팅 전략 수립 → 포스트 초안 생성 → 반응 트래킹.

## 기술 스택

- **Frontend**: Next.js + TypeScript → Vercel
- **Backend**: NestJS + TypeScript → EC2 + Docker
- **Database**: PostgreSQL → AWS RDS / 로컬 Docker
- **ORM**: Prisma
- **Auth**: Passport.js + JWT
- **AI**: Claude API (Anthropic SDK)
- **Payments**: Stripe
- **CI/CD**: GitHub Actions
- **Domain**: varo-go.com (Cloudflare)

## 프로젝트 구조

```
/
├── apps/
│   ├── backend/     # NestJS API
│   └── frontend/    # Next.js
├── CLAUDE.md
└── .claude/
```

## 명령어

```bash
# Backend (apps/backend/)
npm run start:dev    # 개발 서버 (localhost:3000)
npm run test         # 테스트 실행
npm run test:watch   # 테스트 watch 모드
npm run lint         # ESLint
npm run build        # 프로덕션 빌드

# Frontend (apps/frontend/)
npm run dev          # 개발 서버 (localhost:3001)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint

# Docker (로컬 개발)
docker-compose up -d  # PostgreSQL + 백엔드 실행
docker-compose down   # 종료
```

## 코딩 컨벤션

- **파일명**: kebab-case (`auth.service.ts`, `create-product.dto.ts`)
- **클래스명**: PascalCase (`AuthService`, `ProductController`)
- **변수/함수명**: camelCase (`userId`, `createProduct`)
- **상수**: UPPER_SNAKE_CASE (`JWT_SECRET`)
- **들여쓰기**: 2 spaces
- **따옴표**: single quote

## NestJS 규칙

- Controller는 라우팅과 요청/응답만 담당, 로직은 Service로
- 모든 API 응답은 일관된 형태 유지
- DTO에 class-validator 데코레이터 필수
- 모든 엔드포인트에 AuthGuard 또는 Public 데코레이터 명시
- 에러는 NestJS 내장 HttpException 사용

## 환경변수

- `.env` 파일 절대 커밋 금지
- 새 환경변수 추가 시 `.env.example`에도 추가
- 시크릿은 코드에 하드코딩 금지

## 현재 버전

**v0.1** — NestJS 프로젝트 세팅 + Docker 로컬 개발환경

## 버전 로드맵

- v0.1: NestJS 세팅 + Docker + Prisma + DB 연결
- v0.3: 제품 등록 + Claude API 분석
- v0.4: Next.js 프론트엔드 연결
- v0.5: AWS 배포 (EC2 + RDS + CI/CD)
- v0.6: 마케팅 전략 + 초안 생성
- v0.7: Passport.js + JWT 인증
- v0.8: X OAuth + 트래킹 대시보드
- v0.9: Stripe 결제
