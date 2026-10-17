# Tausi — Technical overview

Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.

## Architecture

| Layer | Choice |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Data & auth | Supabase: Postgres, Auth (email/password), Storage, Realtime |
| AI | Google Gemini (`gemini-3.8-flash` by default, set with `GEMINI_MODEL`) via `@google/generative-ai`, server-side only |
| Hosting | Any Node host for Next.js; database on Supabase |

```
Browser (phone or laptop)
  │  pages: /teach /learn /join /play/[code] …
  │  Realtime: postgres_changes + Broadcast on "live:<CODE>"
  ▼
Next.js route handlers (app/api/*)
  │  auth check → authorisation in code → service-role DB client
  ├─► Supabase Postgres (curricula, questions, sessions, answers, mastery)
  └─► Gemini (question drafting, explanations, practice papers from past papers)
```

API routes do their own authorisation and then use a service-role client; Row Level Security is enabled on every table, with read policies only where Realtime needs them (session state for everyone, participants/answers for the session host).

Key folders:

- `curricula/` — curricula as data (HSK 1–2, NECTA Form Two maths sample) and the seed question builders
- `supabase/schema.sql` — the complete database schema (one file, safe to re-run)
- `app/lib/mastery.ts` — the mastery and readiness model (below)
- `app/lib/learning/` — server logic: grading, live sessions, AI pipeline, reports
- `app/components/learn/` — shared UI: question input, review list, realtime hook, QR code
- `scripts/seed.ts` — seeds curricula and the demo dataset

## Shuō — Chinese practice (`/shuo`)

Shuō is a Vite + React single-page app in `shuo/`, built to `public/shuo` and served by Tausi at `/shuo` (rewrite to its `index.html`; its pages use `#/` hash routes). It shares Tausi's Supabase session because it's on the same origin.

- **AI without a browser key:** Shuō's text/JSON/speech calls go through `POST /api/shuo/gemini`, which checks sign-in, rate-limits (local + shared Postgres counter), forwards only `contents`, `systemInstruction` and `generationConfig`, and adds the key server-side. The voice tutor opens the Gemini Live websocket with a single-use ephemeral token from `POST /api/shuo/live-token` (one use, must start within a minute, session ends within 30).
- **Progress sync:** stores marked `sync` are cached per user in localStorage and saved to `shuo_state` (RLS: own rows only).
- **Teacher results:** the student chooses "ask each time" or "automatic"; `POST /api/shuo/results` accepts only classes the student belongs to, writes `shuo_results`, and notifies each teacher. Results appear on the class page and the student drill-down.
- **Security headers:** `/shuo` gets its own CSP (Gemini Live websocket, Google Fonts, Hanzi Writer data on jsDelivr, `blob:` for the audio worklet) and `microphone=(self)`; the rest of Tausi keeps the stricter policy.

## Security & performance

- **Authentication:** every request's access token is verified locally with `getClaims()` (signature and expiry against the project's ES256 keys) in the proxy (`proxy.ts`) and the API routes, instead of a network call to the Auth server on each request (~4 ms vs ~350 ms). Verification failures fail closed: the visitor is treated as signed out.
- **Authorisation:** API routes check ownership/membership in code before using the service-role client; RLS is on for every table. Live-session access goes through one check (`sessionAccess`).
- **Storage:** users can read only their own folder in `exam-papers`; public exams' source papers are signed or downloaded by the server after it checks the exam is public. Teaching resources live in a private bucket served through short-lived signed URLs.
- **Headers:** Content-Security-Policy (no-nonce variant, so pages stay static), HSTS in production, `frame-ancestors 'none'` / `X-Frame-Options: DENY`, `nosniff`, strict `Referrer-Policy`, restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, no `X-Powered-By`.
- **CSRF:** the proxy refuses API writes (POST/PUT/PATCH/DELETE) whose `Origin` or `Sec-Fetch-Site` says they came from another site; webhooks under `/api/webhook/` are exempt.
- **Request limits:** API bodies over 10 MB (64 MB for multipart uploads) are refused with 413 before any work is done. API responses are `Cache-Control: private, no-store` and `Cross-Origin-Resource-Policy: same-origin`.
- **Uploads:** `app/lib/file-check.ts` reads each file's first bytes and accepts only real PDF/PNG/JPEG/WebP (the browser-declared type is ignored), with per-file, total and count limits; storage names are sanitised.
- **Redirects:** every `?next=` (proxy, login, signup, `/auth/callback`) goes through `safeNextPath()`, which allows only same-site paths (blocks `//host`, `/\host`, control characters).
- **Passwords:** sign-up requires 10+ characters with letters and numbers, and refuses common passwords and the email name (`app/lib/password.ts`). Set the same minimum in Supabase → Authentication → Policies so the API enforces it too.
- **Disclosure:** `/.well-known/security.txt` and the `/security` page point researchers to security@tausi.app.
- **Rate limiting:** an in-memory limiter on every route, plus a shared Postgres counter (`rate_limit_hit`) on the AI routes so limits hold when the host runs several instances behind a load balancer.
- **Performance:** independent queries run in parallel, indexes cover the filters the reports and class views use, static logos are cached, and the browser preconnects to Supabase only (fonts are self-hosted; AI calls are server-side).

## Curriculum engine

```
curricula ─┬─ curriculum_levels ─┬─ knowledge_points (KPs)
           │                     └─ questions ── question_kps ── knowledge_points
```

- A curriculum (e.g. HSK) has levels (HSK 1, HSK 2); each level has knowledge points with a category and an `is_core` flag.
- Every question is tagged with one or more KPs of its level.
- Curricula are **data**: adding a syllabus means adding a file under `curricula/` and running the seed — no application code changes.

Seeded content (all original; nothing is copied from real exam papers):

| Curriculum | Levels | KPs | Questions |
|---|---|---|---|
| HSK Chinese (public HSK 2.0 syllabus) | HSK 1, HSK 2 | 36 | 432 |
| NECTA Form Two Basic Mathematics (sample) | Form Two | 6 | 35 |

HSK vocabulary questions are generated from templates over the public word lists (meaning, reverse meaning, tone/pinyin); grammar, measure-word and culture questions are hand-written.

Question types are auto-gradable: multiple choice, true/false, fill-in-the-blank (normalised exact match).

## Teaching resources

Teachers upload notes, slides and documents (PDF, Word .docx, PowerPoint .pptx, text/Markdown; up to 25 MB), optionally shared with a class.

1. The browser uploads the file straight to a private Supabase Storage bucket using a signed upload URL, so hosting request-size limits do not apply.
2. The server extracts plain text (`app/lib/learning/extract.ts`): `unpdf` for PDFs, `mammoth` for Word, slide and speaker-note text from the PowerPoint XML via `jszip`. Scanned PDFs with no text layer are transcribed by Gemini.
3. Gemini summarises the material and splits it into 3–8 topics.
4. The resource becomes a level in the teacher's private "Class materials" curriculum, with its topics as knowledge points.

Because each resource is an ordinary curriculum level, everything downstream works unchanged:

- **Students** in the class can read the extracted text in the app or download the original. They can **create a practice exam** from it (choosing how many questions of each type): questions are drafted from the resource text only and tagged with its topics. Answers update per-topic mastery, and the resource appears in their readiness view like any curriculum level. These questions are stored with provenance `ai_practice` (AI-generated for self-practice, not teacher-reviewed) and are never offered in the teacher's question bank.
- **Teachers** can draft exam questions **from notes** in the builder: pick an uploaded resource (or upload one there) and the AI drafts questions grounded in it, tagged with the exam's knowledge points, for the usual approve/edit/reject review.

## Mastery and readiness (`app/lib/mastery.ts`)

**Mastery** of one KP for one student:

```
mastery = (P · m₀ + Σ wᵢ · cᵢ) / (P + Σ wᵢ)

cᵢ = 1 if answer i was correct, else 0
wᵢ = 0.5 ^ (ageᵢ in days / 14)        recency weight, half-life 14 days
m₀ = 0.5                              prior ("unknown")
P  = 2                                prior strength, in virtual answers
```

One correct answer gives 67 %, three in a row 80 %, ten in a row 92 %, so one lucky answer cannot mark a topic as mastered. Bands: weak < 50 %, developing 50–79 %, mastered ≥ 80 %.

Mastery is recomputed from the full answer history after every answer (game mode), on exam submission and after practice sets, and stored in `kp_mastery`.

**Readiness** for a level: weighted mean of KP mastery (core KPs ×2; unpractised KPs count at 0.5).

- *Likely ready*: score ≥ 75 %, at least 70 % of KPs practised, no core KP below 50 %
- *Almost ready*: score ≥ 60 %
- *Not ready yet*: otherwise

At-risk KPs are practised KPs below 50 %, weakest first.

**Adaptive practice** ("Practice my weak areas") picks the three weakest practised KPs below 80 % (then unpractised core KPs), allocates 5 / 3 / 2 questions to them, and skips questions answered correctly in the last 7 days.

## Live sessions

| Mode | Flow | Scoring |
|---|---|---|
| Exam | lobby → active → finished; all questions at once, one timer, no leaderboard | 1 point per correct answer |
| Game | lobby → question ⇄ reveal → finished; teacher paces each question | 500 for correct + up to 500 for speed + 50 × streak (max +250) |

- Students join with no install by scanning a QR code, opening a link, or typing a six-character code (no ambiguous characters).
- The teacher chooses per session whether sign-in is required. Signed-in students' answers feed their mastery; guests get a device token and still receive a personal review.
- Sync: each screen refetches its state on any of (1) Supabase Realtime `postgres_changes` on the session row (plus participants/answers for the host), (2) a Supabase Realtime Broadcast ping on `live:<CODE>` sent after every action, (3) a poll every 3 s while Realtime is disconnected, 20 s otherwise. The server is always the source of truth.
- Answers are graded on the server; question payloads sent to students never include the answer.

### Classes, access and notifications

- Every class has a join code and a **class QR code** (`/classes/join/<CODE>`, shown on the class page). Scanning it signs the student in if needed and adds them to the class.
- A class is **private** (default) or **public**. Every way into a live exam (QR code, link, typed code or notification) goes through the same check (`sessionAccess` in `app/lib/learning/live.ts`):
  - the host is always allowed;
  - a **private** class's exam admits signed-in members of that class only — anyone else sees "Members only" and cannot join;
  - a **public** class's exam (or one with no class) admits anyone, signed in if the teacher required it.
- When a teacher opens a live exam for a class, every member gets a **notification** (in-app bell, delivered live through Supabase Realtime). Open class exams are also listed on the student's learning page. Tapping either opens the exam, and signed-in members join in one tap with their profile name.

## AI pipeline

All AI calls run on the server (`app/lib/learning/ai.ts`) with a JSON response schema, and every result is validated with zod before it is stored.

1. **Question drafting (teacher-in-the-loop).** The teacher picks a level, KPs and counts per type (up to 30 per type, 40 per request; larger requests run as parallel batches of 10 and are de-duplicated). The prompt includes KP names and descriptions, a few approved bank questions as style examples, and the prompts already in the exam (to avoid duplicates). Drafts are stored with `status = draft`, `provenance = ai_draft`.
2. **Teacher review.** Each draft is approved, edited, regenerated or rejected. Only approved questions are published. Provenance is tracked per question:
   - `seed` — from the curriculum seed
   - `ai_draft` — written by AI, approved as-is
   - `ai_edited` — written by AI, edited by the teacher
   - `teacher` — written by the teacher (including edited copies of bank questions)
   - `ai_practice` — written by AI from a teacher's resource for a student's self-practice (not reviewed; never added to class exams)

   The builder shows the counts per exam ("Sources: …") for AI-usage disclosure.
3. **Explanations.** After a student finishes, explanations are generated in the student's chosen language (English, Kiswahili or Chinese), with a cultural note only where it helps understanding. They are generated once per (question, language), cached in `question_explanations`, and served from the cache to everyone afterwards. Explanations are only returned for questions the requester has already answered.
4. **Practice papers from past papers** (existing feature, repositioned): upload past papers and Gemini builds a new practice paper in the same format with a marking scheme and weak-points analysis. Prompts state that practice papers are learning tools, not predictions of real exam content.

## Internationalisation

UI strings live in `app/lib/translations.ts` (English, Kiswahili), `app/lib/i18n/zh.ts` (Chinese overrides; untranslated legacy keys fall back to English) and `app/lib/i18n/learn.ts` (all learning-platform strings, complete in all three languages). The language switcher is in the header and on the join screen.

## Demo data

`npm run seed -- --demo` creates one teacher, one class (code `HSKCLS`), ten students with animal nicknames (no personal names), five past sessions over five weeks with realistic, varied answer histories, and some self-practice. Mastery is computed from those answers by the same module the app uses.

## Third-party libraries

| Library | Version | Licence | Use |
|---|---|---|---|
| next | 16.2.6 | MIT | Web framework |
| react, react-dom | 19.2.4 | MIT | UI |
| @supabase/supabase-js | 2.106.2 | MIT | Database, auth, realtime client |
| @supabase/ssr | 0.10.3 | MIT | Supabase auth cookies in Next.js |
| @google/generative-ai | 0.24.1 | Apache-2.0 | Gemini API client |
| zod | 4.4.3 | MIT | Validation of requests and AI output |
| qrcode | 1.5.4 | MIT | QR codes for joining sessions |
| vite, @vitejs/plugin-react | 8.3.0, 6.1.1 | MIT | Building Shuō |
| hanzi-writer | 3.7.3 | MIT | Shuō stroke-order animation and handwriting quizzes |
| pinyin-pro | 3.29.4 | MIT | Shuō pinyin conversion |
| unpdf | 1.9.0 | MIT | Text extraction from PDF resources |
| mammoth | 1.13.0 | BSD-2-Clause | Text extraction from Word resources |
| jszip | 3.10.2 | MIT (dual MIT / GPL-3.0; used under MIT) | Reading PowerPoint resources |
| tailwindcss, @tailwindcss/typography | 4, 0.5.19 | MIT | Styling |
| react-markdown, remark-gfm, remark-math, rehype-katex | 10.1.0, 4.0.1, 6.0.0, 7.0.1 | MIT | Rendering practice papers |
| katex | 0.17.0 | MIT | Maths rendering |
| @vercel/analytics | 2.0.1 | MIT | Page analytics |
| Geist, Geist Mono, Bricolage Grotesque (via next/font) | — | SIL OFL 1.1 | Fonts |

AI service: Google Gemini API (Google's terms of service). HSK vocabulary lists follow the publicly available HSK 2.0 syllabus; no HSK exam papers were used.
