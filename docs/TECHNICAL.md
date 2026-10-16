# Tausi — Technical overview

Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.

## Architecture

| Layer | Choice |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Data & auth | Supabase: Postgres, Auth (email/password), Storage, Realtime |
| AI | Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai`, server-side only |
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
- `supabase/migrations/001_learning_platform.sql` — schema for the learning platform
- `app/lib/mastery.ts` — the mastery and readiness model (below)
- `app/lib/learning/` — server logic: grading, live sessions, AI pipeline, reports
- `app/components/learn/` — shared UI: question input, review list, realtime hook, QR code
- `scripts/seed.ts` — seeds curricula and the demo dataset

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

## AI pipeline

All AI calls run on the server (`app/lib/learning/ai.ts`) with a JSON response schema, and every result is validated with zod before it is stored.

1. **Question drafting (teacher-in-the-loop).** The teacher picks a level, KPs and counts per type. The prompt includes KP names and descriptions, a few approved bank questions as style examples, and the prompts already in the exam (to avoid duplicates). Drafts are stored with `status = draft`, `provenance = ai_draft`.
2. **Teacher review.** Each draft is approved, edited, regenerated or rejected. Only approved questions are published. Provenance is tracked per question:
   - `seed` — from the curriculum seed
   - `ai_draft` — written by AI, approved as-is
   - `ai_edited` — written by AI, edited by the teacher
   - `teacher` — written by the teacher (including edited copies of bank questions)

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
| tailwindcss, @tailwindcss/typography | 4, 0.5.19 | MIT | Styling |
| react-markdown, remark-gfm, remark-math, rehype-katex | 10.1.0, 4.0.1, 6.0.0, 7.0.1 | MIT | Rendering practice papers |
| katex | 0.17.0 | MIT | Maths rendering |
| @tiptap/* | 3.23.6 | MIT | AI Writer editor |
| @vercel/analytics | 2.0.1 | MIT | Page analytics |
| Geist, Geist Mono, Bricolage Grotesque (via next/font) | — | SIL OFL 1.1 | Fonts |

AI service: Google Gemini API (Google's terms of service). HSK vocabulary lists follow the publicly available HSK 2.0 syllabus; no HSK exam papers were used.
