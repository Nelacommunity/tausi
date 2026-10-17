# 说 Shuō — AI Mandarin Coach

A personal Chinese-learning web app built on Google Gemini: real-time voice conversation, AI lessons, pronunciation scoring, spaced repetition, handwriting, graded reading and a mistake notebook that ties it all together.

## Part of Tausi

Shuō lives inside the Tausi repo and is served by Tausi at **`/shuo`** (a "Shuō · Chinese" item in Tausi's sidebar).

- **One login:** Shuō uses Tausi's Supabase session (same origin, same cookies). Signed-out visitors are sent to Tausi's login.
- **No API key in the browser:** text, JSON and speech requests go through `POST /api/shuo/gemini`; the voice tutor connects to Gemini Live with a single-use token from `POST /api/shuo/live-token`. Both require sign-in and are rate-limited.
- **Saved progress:** settings, progress, flashcards, mistakes, speaking sessions and custom lessons sync to the `shuo_state` table (each student's own rows only). A device's existing local progress is uploaded the first time.
- **Learning history:** every finished lesson, voice call, speaking report, chat, Tone Lab drill, story, handwriting run and mistake quiz is logged to `shuo_activity` and shown on the **History** page (and "Recent activity" on Home).
- **Languages:** English, Kiswahili and 中文 (switcher in the sidebar and Settings). It shares Tausi's `tausi_lang` setting, so changing it in either app changes both. Strings live in `src/locales/` (`en.ts` is the source shape; curriculum and scenario names in `content.ts`). The tutor explains in the interface language unless the student picks another in Settings.
- **Results for teachers:** in Settings the student chooses "Ask me each time" (a *Send to teacher* button after lessons and speaking reports) or "Send automatically". Results go to `shuo_results` for the classes they joined; teachers see them on the class and student pages and get a notification.

### Build

```bash
npm run build:shuo   # from the Tausi root → public/shuo (also runs before `npm run dev` and in `npm run build`)
npm run dev:shuo     # rebuild on change while working on Shuō
```

## Features

| Page | What it does |
|---|---|
| 🎙️ **Voice Tutor** | Live spoken conversation with Gemini Live (interruptible, native audio). 13 scenarios (restaurant, taxi, job interview, business meeting, debate, HSKK exam…) or your own. Guided / Immersion / Strict modes. Live transcript with tap-to-define, "What can I say?" hints, and a post-call **feedback report** (scores, corrections, native phrasing, vocab). |
| 📚 **Lessons** | HSK 1→6 curriculum (40 units) plus custom lessons on any topic. Each lesson: vocab, grammar, dialogue, culture note, 10 exercises (multiple choice, fill-in, word order, listening, AI-graded translation). Ends with a hand-off to the Voice Tutor to practise speaking it. |
| 💬 **Chat Tutor** | Written conversation; every message is corrected with explanations. |
| 🎵 **Tone Lab** | Your pitch curve drawn over a native (Gemini TTS) curve, plus per-syllable AI assessment of tones and sounds. |
| 🃏 **Flashcards** | SM-2 spaced repetition, built-in HSK 1–2 decks, AI topic decks, AI mnemonics/etymology. |
| ✍️ **Characters** | Stroke-order animation and stroke-checked handwriting quizzes (Hanzi Writer). |
| 📖 **Reader** | AI graded stories at your level (or paste any text), tap-any-word dictionary, audio, comprehension quiz. |
| 📓 **Mistakes** | Every correction from every feature, with AI pattern analysis and a weak-spot quiz. |

## Notes

- Progress is cached in the browser per account and saved to Supabase. **Settings → Export backup** still works.
- Model IDs are fixed in code (`MODELS` in `src/lib/state.ts`), not shown to students: `gemini-3.6-flash` (text), `gemini-3.1-flash-live-preview` (voice), `gemini-3.1-flash-tts-preview` (speech).
- Use headphones for voice sessions to avoid echo.
