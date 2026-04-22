# Splash AI

Splash AI is a premium AI university tutor. Students create courses, upload their lecture notes and slides, then learn with a tutor that teaches step-by-step across four modes (Learn, Practice, Revision, Direct), cites the exact page it answered from, generates quizzes from the uploaded material, and tracks mastery over time. It is a full-stack SaaS MVP built on Next.js 15, Postgres + pgvector, and a pluggable AI-provider layer — designed to look, feel, and scale like a real product, not a demo.

---

## Tech stack

| Layer        | Choice                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router) · React 19 · TypeScript (strict)                      |
| Styling      | Tailwind CSS v3 · hand-rolled shadcn-style primitives on Radix · lucide icons |
| Database     | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector)              |
| ORM          | Prisma 5 (with `Unsupported("vector(1536)")` + raw SQL for similarity)        |
| Auth         | NextAuth v5 (Auth.js) · credentials (bcryptjs) · Prisma adapter               |
| AI layer     | Custom `AIProvider` interface · OpenAI impl (`gpt-4o-mini` chat + `text-embedding-3-small`) |
| Streaming    | Vercel AI SDK (`ai` + `@ai-sdk/openai`) — SSE on the server, custom reader on the client |
| PDF parsing  | `pdf-parse` (server)                                                          |
| Chunking     | Recursive character splitter (~500 tokens, 50 overlap) — no LangChain         |
| Validation   | Zod on every route + structured AI output                                     |
| Storage      | `StorageProvider` abstraction · local disk in dev, S3/Supabase-ready          |
| Markdown     | `react-markdown` + `remark-gfm` + `rehype-highlight`                          |

---

## Prerequisites

- **Node.js 20+**
- **PostgreSQL 16+ with pgvector**. Options:
  - [Neon](https://neon.tech) (pgvector is pre-enabled — easiest)
  - [Supabase](https://supabase.com) (enable `vector` in the dashboard)
  - Local Postgres: `brew install postgresql pgvector` then `CREATE EXTENSION vector;` inside your database
- **OpenAI API key** — needed for embeddings + chat. The app degrades gracefully without one (chat returns a clear error; seed skips embedding), but RAG is disabled.

---

## Local setup

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
# fill in:
#   DATABASE_URL       your Postgres connection string
#   NEXTAUTH_SECRET    openssl rand -base64 32
#   OPENAI_API_KEY     sk-...

# 3. Database
npm run db:migrate      # applies the initial migration (CREATE EXTENSION vector + HNSW index)
npm run db:seed         # creates demo@splash.ai / demo1234 + BUS101 + sample quiz

# 4. Run
npm run dev             # http://localhost:3000
```

Sign in at `/login` with `demo@splash.ai` / `demo1234`, or register a fresh account at `/register`.

### Scripts

| Command               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Next dev server                            |
| `npm run build`       | Production build                           |
| `npm start`           | Start production server                    |
| `npm run typecheck`   | `tsc --noEmit`                             |
| `npm run lint`        | `next lint`                                |
| `npm run db:migrate`  | `prisma migrate dev`                       |
| `npm run db:generate` | Regenerate Prisma client                   |
| `npm run db:seed`     | Seed demo user + course + materials + quiz |
| `npm run db:studio`   | Prisma Studio (DB inspector)               |

---

## How RAG works

The retrieval-augmented generation pipeline is the core of Splash AI. Every tutor reply is grounded in the student's own material, with inline citations back to the exact chunk.

```
┌──────────┐   ┌──────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐
│  Upload  │ → │  Parse   │ → │ Chunk  │ → │  Embed   │ → │ Retrieve │ → │  Cite  │
└──────────┘   └──────────┘   └────────┘   └──────────┘   └──────────┘   └────────┘
   /api/upload   pdf-parse /  chunkingS.  embeddingS.   retrievalS.    tutorService
                 txt / md    (~500 tok)  (OpenAI 1536)  (pgvector <=>)  stream reply
```

1. **Upload** (`POST /api/upload`) — auth → mime whitelist (pdf/txt/md) → size cap → `StorageProvider.save` → create `CourseMaterial(status=PENDING)`.
2. **Parse** — `pdfParserService.extract` (pdf-parse for PDFs, passthrough for text). Status → `PROCESSING`.
3. **Chunk** — `chunkingService.chunkText` splits on paragraph/sentence boundaries targeting ~500 tokens with 50-token overlap.
4. **Embed** — `embeddingService.embedBatch` calls OpenAI in batches of 100 with retry. Vectors written to the `embedding vector(1536)` column via raw `$executeRaw` (Prisma doesn't type pgvector natively).
5. **Retrieve** — at chat time, user question → embedded → cosine-similarity search against chunks for that course, ranked by `embedding <=> $vector`. Top *k* (default 6) are formatted as labelled sources.
6. **Cite** — chunks injected into the system prompt as `[SOURCE 1 — lecture-03.pdf · page 4] …`. The tutor is instructed to use `[1]`, `[2]` inline and refuse to invent. The client parses citations, shows them as chips under each assistant message, and opens a source drawer on click.

The HNSW index (`USING hnsw (embedding vector_cosine_ops)`) keeps retrieval fast as the corpus grows.

---

## Switching AI providers

The AI layer is behind a single interface in [`src/providers/ai/types.ts`](src/providers/ai/types.ts):

```ts
export interface AIProvider {
  readonly chatModel: string
  readonly embeddingModel: string
  readonly embedDim: number

  chatStream(p: { messages: AIMessage[]; system?: string; temperature?: number }):
    AsyncIterable<string>

  chatJSON<T>(p: { messages: AIMessage[]; system?: string; schema: z.ZodType<T> }):
    Promise<T>

  embed(texts: string[]): Promise<number[][]>
}
```

To add Anthropic, Gemini, or a local model:

1. Create `src/providers/ai/<name>.ts` implementing `AIProvider`.
2. Register it in the factory at `src/providers/ai/index.ts`.
3. Set `AI_PROVIDER=<name>` and any required env vars.

Nothing else needs to change — routes call `getAIProvider()` and never import a vendor SDK directly.

The same pattern applies to `StorageProvider` in [`src/providers/storage/`](src/providers/storage/) — add an `s3.ts` impl and flip `STORAGE_PROVIDER=s3`.

---

## Project structure

```
splash-ai/
├── prisma/
│   ├── schema.prisma              # all models + vector column
│   ├── migrations/20260101000000_init/
│   │   └── migration.sql          # CREATE EXTENSION vector + HNSW index
│   └── seed.ts                    # demo user + BUS101 + embedded primers + sample quiz
├── src/
│   ├── app/
│   │   ├── (auth)/                # login, register
│   │   ├── (app)/                 # auth-guarded
│   │   │   ├── (pages)/           # standard shell: dashboard, courses, quiz, progress, settings
│   │   │   └── (fullscreen)/      # full-bleed shell: chat session
│   │   └── api/                   # all route handlers
│   ├── components/                # ui/ primitives + feature components (chat/, quiz/, course/, …)
│   ├── lib/                       # prisma, auth config, utils, rate-limit
│   ├── services/                  # business logic (tutor, quiz, progress, RAG pipeline)
│   ├── providers/
│   │   ├── ai/                    # AIProvider interface + OpenAI impl
│   │   └── storage/               # StorageProvider interface + local impl
│   ├── prompts/                   # base identity + per-mode deltas + quiz prompt + composer
│   ├── hooks/                     # useChatSession, useToast
│   └── middleware.ts              # redirect unauthenticated → /login
└── .env.example
```

**Routing note:** the `(app)` group contains two nested groups — `(pages)` for the standard padded shell and `(fullscreen)` for the edge-to-edge chat session. Both share the same auth guard in [`src/app/(app)/layout.tsx`](src/app/(app)/layout.tsx) but render different `AppShell` variants.

---

## Deploy to Vercel + Neon

1. **Create a Neon project** at [neon.tech](https://neon.tech). pgvector is pre-installed — no extension setup needed.
2. **Copy the pooled connection string** from Neon into `DATABASE_URL`. Append `?sslmode=require` if the string doesn't already include it.
3. **Vercel → New Project → Import this repo.**
4. **Environment variables** on Vercel (Production + Preview):
   - `DATABASE_URL` (Neon pooled)
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` (`https://<your-domain>`)
   - `AUTH_TRUST_HOST=true`
   - `AI_PROVIDER=openai`
   - `OPENAI_API_KEY`
   - `STORAGE_PROVIDER=local` — **swap to S3 before you share the deploy**; ephemeral Vercel filesystems will lose uploads between deploys.
5. **Build command override:** `prisma migrate deploy && next build` so migrations run before the build.
6. **Push** — Vercel builds, applies migrations, and serves at your domain.

For self-hosted Postgres, run `CREATE EXTENSION IF NOT EXISTS vector;` on the database once before `prisma migrate deploy`.

---

## Roadmap

- Durable background queue for upload processing (BullMQ or Inngest) — today uploads process inline with the request.
- OAuth providers (Google, GitHub) on the existing NextAuth config.
- S3 / Supabase Storage implementation behind `StorageProvider`.
- Streaming quiz generation (structured output chunk-by-chunk rather than one round-trip).
- Spaced repetition scheduling over `TopicProgress` to surface the right weak topics on a cadence.
- Voice tutor (TTS + STT) on top of the existing chat pipeline.
- Production rate limiting via Upstash (the current in-memory LRU is per-instance).
