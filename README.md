# 🧵 Varogo

**Threads marketing copilot for indie developers**

Varogo gives indie makers an AI partner that already understands their product. Plug in a URL, connect Threads, and co-write daily posts that match your voice — without learning marketing theory.

**Service Link:** https://varo-go.com (Status: MVP, pending Meta review)

<br/>

## 📋 Project Overview

A Threads marketing copilot built around two onboarding artifacts — a product analysis (Dunford-style positioning) and an imported voice profile — that ground every post draft.

**Content loop:**
- 🔍 **Product Analysis**: AI extracts category, JTBD, positioning, and differentiators from a URL
- 🗣️ **Voice Import**: Pulls your recent Threads posts to learn tone, opening patterns, and signature phrases
- ✍️ **3-Hook Generation**: Produces three angles per post (Story / Contrarian / Data / Positioning / Technical), each grounded in your voice
- 🚀 **One-Click Publish**: Edit body, hit publish — straight to Threads via the Graph API

<br/>

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔎 **Product Analysis** | URL-driven Dunford positioning via Gemini |
| 🧬 **Voice Profile** | Style fingerprint + reference samples extracted from your Threads history |
| 🎯 **3-Angle Hooks** | OpenAI generates three differentiated openers, each angle-labeled |
| 📝 **Body Editor** | 500-char counter, draft autosave, hook → body carry-over |
| 🚀 **Threads Publish** | Container status polling + optimistic locking for safe one-click publish |
| 🗂️ **Drafts & Published** | Per-product post list with deep-link resume |

<br/>

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS 4, TanStack Query |
| **Backend** | NestJS 11, TypeScript, Passport.js + JWT |
| **Database** | PostgreSQL, Prisma 6 |
| **AI** | OpenAI (gpt-4o-mini), Google Gemini (gemini-2.5-flash-lite) |
| **External** | Threads Graph API |
| **Infrastructure** | AWS EC2 + Docker, AWS RDS, Vercel, Cloudflare |
| **CI/CD** | GitHub Actions |
| **Tools** | pnpm workspaces, Turbopack, SWC |

<br/>

## 📁 Project Structure

```
/
├── apps/
│   ├── backend/              # NestJS API (port 3000)
│   │   └── src/
│   │       ├── auth/
│   │       ├── llm/          # OpenAI + Gemini clients
│   │       ├── post-draft/   # Hook generation + publish flow
│   │       ├── product/      # Product + analysis
│   │       ├── threads/      # Threads OAuth + Graph API
│   │       └── voice-profile/
│   └── frontend/             # Next.js (port 3001)
│       └── src/
│           ├── app/          # App Router pages
│           ├── features/     # Domain-specific modules
│           │   ├── auth/
│           │   ├── post-draft/
│           │   ├── product/
│           │   ├── threads/
│           │   └── voice-profile/
│           ├── components/   # Shared UI
│           ├── hooks/
│           └── lib/
└── .github/workflows/        # CI + deploy automation
```
