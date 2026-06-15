# 🧵 Varogo

**Threads marketing copilot for indie developers**

Varogo gives indie makers an AI partner that already understands their product. Plug in a URL, connect Threads, and co-write daily posts that match your voice — without learning marketing theory.

**Service Link:** https://varo-go.com — Status: MVP (Meta App Review in progress)

> [!IMPORTANT]
> **External access currently limited.** Threads Graph API integration is under Meta App Review, so new users will be blocked at the OAuth step. The demo video below shows the full flow end-to-end.

<br/>

## 🎥 Demo

https://github.com/user-attachments/assets/2058913e-c5e8-44dc-afb8-043b854e2680

<br/>

## 📋 Project Overview

A Threads marketing copilot built around two onboarding artifacts — a product analysis and an imported voice profile — that ground every post draft.

**Content loop:**

- 🔍 **Product Analysis**: AI analyzes your product's target audience, value prop, and competitive edges from a URL
- 🗣️ **Voice Import**: Pulls your recent Threads posts to learn tone, opening patterns, and signature phrases
- 🤖 **Multi-Agent Generation**: A LangGraph pipeline (Research → Planning → Generation → Evaluation) produces three differentiated post drafts grounded in your voice
- 🚀 **One-Click Publish**: Edit body, hit publish — straight to Threads via the Graph API

<br/>

## ✨ Key Features

| Feature                   | Description                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| 🔎 **Product Analysis**   | AI-driven marketing strategy and positioning via Gemini                                  |
| 🧬 **Voice Profile**      | Style fingerprint extracted from Threads history; manual import for cold-start users     |
| 🤖 **Generation Pipeline**| LangGraph multi-agent pipeline: Research → Planning → Generation → Evaluation            |
| 🎯 **3 Angle Options**    | Three differentiated drafts per run (Story / Contrarian / Data / Positioning / Technical)|
| 📝 **Body Editor**        | 500-char counter, draft autosave, angle → body carry-over                                |
| 🚀 **Threads Publish**    | Container status polling + optimistic locking for safe one-click publish                 |
| 🗂️ **Drafts & Published** | Per-product post list with deep-link resume                                              |
| 🔐 **Auth**               | Email/password + Google OAuth, forgot password via AWS SES                              |

<br/>

## 🤖 Generation Pipeline

Post draft generation runs as a four-node LangGraph graph:

```
Research Agent → Planning Agent → Generation Agent → Evaluator Agent
```

| Node | Role | Model |
| ---- | ---- | ----- |
| **Research** | Calls `search_hn` + `search_devto` directly; synthesizes trend signals into a brief | Gemini flash-lite |
| **Planning** | ReAct agent — calls `search_trends` (HN + Dev.to combined) to pick three post angles | gpt-4o-mini |
| **Generation** | Writes three angle-differentiated drafts grounded in voice profile (parallel async) | gpt-4o-mini |
| **Evaluator** | Runs `artifact_filter` (regex auto-correct + issue detection) then voice-match eval; triggers repair loop on failure | Gemini flash-lite |

An `artifact_filter` post-processing step strips clichés and formatting violations before the drafts are returned.

<br/>

## 🛠️ Tech Stack

| Category           | Technologies                                                         |
| ------------------ | -------------------------------------------------------------------- |
| **Frontend**       | Next.js 16, React 19, TypeScript, TailwindCSS 4, TanStack Query      |
| **Backend**        | FastAPI, Python 3.12, SQLAlchemy (async), Alembic                    |
| **Auth**           | python-jose + JWT (httpOnly cookie), Google OAuth 2.0, AWS SES       |
| **Database**       | PostgreSQL (AWS RDS / local Docker)                                  |
| **AI**             | OpenAI (gpt-4o-mini), Google Gemini (gemini-2.5-flash-lite), LangGraph |
| **External**       | Threads Graph API                                                    |
| **Observability**  | Sentry, LangSmith, Discord webhooks                                  |
| **Infrastructure** | AWS EC2 + Docker, AWS RDS, Vercel, Cloudflare                        |
| **CI/CD**          | GitHub Actions                                                       |
| **Tools**          | pnpm workspaces, Turbopack, Poetry                                   |

<br/>

## 📁 Project Structure

```
/
├── apps/
│   ├── backend/              # FastAPI API (port 3000)
│   │   └── app/
│   │       ├── core/         # Config, Discord/SES notifications
│   │       ├── auth/         # JWT + Google OAuth + password reset
│   │       ├── llm/          # OpenAI + Gemini clients
│   │       ├── post_draft/   # Generation pipeline + publish flow
│   │       │   └── generation_pipeline/
│   │       │       ├── nodes/    # research, planning, generation, evaluator
│   │       │       └── tools/    # search_trends, search_hn, search_devto
│   │       ├── products/     # Product + Gemini analysis
│   │       ├── threads/      # Threads OAuth + Graph API
│   │       └── voice_profile/ # Threads import + manual import (paste/preset/custom)
│   └── frontend/             # Next.js (port 3001)
│       └── src/
│           ├── app/          # App Router pages
│           ├── features/     # Domain-specific modules
│           │   ├── auth/
│           │   ├── landing/
│           │   ├── post-draft/
│           │   ├── product/
│           │   ├── threads/
│           │   └── voice-profile/
│           ├── components/   # Shared UI
│           ├── stores/       # Zustand (auth, UI state)
│           ├── providers/    # Auth + Query providers
│           └── lib/
└── .github/workflows/        # CI + deploy automation
```
