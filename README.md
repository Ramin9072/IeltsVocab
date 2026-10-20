# IELTS Vocab

A mobile-first vocabulary app for IELTS students: save words, phrases and sentences with Persian translations, practice them seven ways, and let spaced repetition schedule reviews. Each account is private. The interface works in English (LTR) and Persian (RTL); English vocabulary is always rendered left-to-right.

**Stack:** Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 3 · Lucide icons · Zod · Auth.js (`next-auth@beta`, v5) · **Upstash Redis** (the only database) · bcryptjs · Vitest.
Fonts (Vazirmatn, Bricolage Grotesque) are bundled through `@fontsource-variable/*`, so builds need no network access to Google Fonts. UI components are small hand-written, accessible primitives in `src/components/ui.tsx` (shadcn-style, no generator needed).

## Features

- Register, log in, log out; 30-day persistent sessions; protected dashboard; per-user data.
- Words, phrases and sentences with: Persian translation, English definition, example, part of speech, synonyms, antonyms, pronunciation, tags, collection, notes, difficulty. Everything except the English text is optional.
- Edit, delete (with confirmation), view details; duplicate protection on normalized English text.
- Library: search (English, Persian, tags), filter by collection / tag / difficulty / review status, sort (newest, oldest, A–Z, most practiced), pagination.
- Collections: create, rename, delete safely (words are kept and moved to "No collection"), assign from the word form.
- Practice: English→Persian, Persian→English, definitions, mixed multiple choice, typing, difficult-word review, and a **pronunciation check** (read a sentence aloud and see which words were understood). Choose question count, collection or hand-picked words, new vs. practiced words. One question at a time, instant feedback, correct answer, progress bar, session summary.
- Exact practice counting, idempotent answers, spaced repetition, dashboard and progress statistics from real stored data.
- Pronunciation: listen to any English word (word details, library, practice), slowly, or repeated 3 times for shadowing. Uses the device's built-in voices (Web Speech API), so there is no server, key or cost.
- Voice typing: a microphone button next to the English field, the Persian field and the typing-practice answer. Press it, speak, and the text is typed for you (you still press Save / Check yourself).
- Pronunciation check: the app shows a sentence (a word's example sentence, or a saved phrase/sentence), you can listen to it (normal, slow, repeated), tap the microphone and read it aloud, review what was heard, then press Check. Each word is marked understood or not, with a percentage and a "words to work on" list you can listen to. 80% or more of the words counts as correct and is tracked like any other answer (attempt count, review schedule, statistics, idempotent). You can also type your own sentence to practice; that is scored in the browser and not counted.
- CSV import (with per-row validation report, nothing silently dropped) and export.
- Optional translation / definition / enrichment assistant (Gemini or any OpenAI-compatible API). Suggestions are shown for review and are **never saved automatically**.
- Light / dark / system theme, English / Persian UI, keyboard-accessible, visible focus, reduced-motion friendly.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash Redis REST token (read/write) |
| `AUTH_SECRET` | yes | Signs session cookies. `openssl rand -base64 32` |
| `TRANSLATION_PROVIDER` | no | `gemini` or `openai` (OpenAI-compatible) |
| `TRANSLATION_API_KEY` | no | Key for that provider. Server-side only, never sent to the browser |
| `TRANSLATION_MODEL` | no | Override the default model (`gemini-flash-latest` / `gpt-4o-mini`) |
| `TRANSLATION_BASE_URL` | no | For `openai`: e.g. `https://api.groq.com/openai/v1` (Groq has a free tier) |

Without the translation variables everything still works; the "Translation help" panel just says it isn't set up. Without the Redis variables the app builds and starts, and API calls answer `503 not_configured` instead of crashing. Never commit real secrets (`.env*` is git-ignored except `.env.example`).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

**Option A: free Upstash database.** Create a Redis database at <https://console.upstash.com>, copy *REST URL* and *REST Token* from its page into `.env.local`.

**Option B: fully offline** (needs `redis-server` installed):

```bash
redis-server --port 6379 &
npm run local-proxy &          # Upstash-compatible REST front for local Redis (dev only)
# .env.local:
# UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079
# UPSTASH_REDIS_REST_TOKEN=local-dev-token
```

Scripts: `npm run lint` · `npm run typecheck` · `npm test` (starts its own throwaway `redis-server`, which must be on `PATH`) · `npm run build`.

## Deploy to Vercel

1. Push the project to GitHub and **Import** it in Vercel (framework preset: Next.js; no build overrides).
2. **Connect Upstash Redis**, either way:
   - *Marketplace integration:* Vercel dashboard → your project → **Storage** → **Upstash** → create a Redis database → connect it to the project. It injects REST credentials as environment variables. Check the names it created: if they are `KV_REST_API_URL` / `KV_REST_API_TOKEN`, add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` with the same values (this app reads the `UPSTASH_*` names).
   - *Manual:* create the database at console.upstash.com (pick a region close to your Vercel Functions region), then Vercel → **Settings → Environment Variables** and add the two `UPSTASH_*` variables for Production (and Preview if wanted).
3. Add `AUTH_SECRET` (and optionally the translation variables) under **Environment Variables**.
4. Deploy. Auth.js trusts the Vercel host automatically (`trustHost: true`).
5. Smoke-test the deployment: register → add a word → practice it → check the dashboard counts it once.

Nothing is written to the local filesystem; all state is in Redis, so serverless instances are interchangeable.

## Translation providers

- **Gemini (free tier):** get a key from Google AI Studio → `TRANSLATION_PROVIDER=gemini`, `TRANSLATION_API_KEY=...`.
- **Groq / OpenRouter / OpenAI / others:** `TRANSLATION_PROVIDER=openai`, set `TRANSLATION_BASE_URL` and `TRANSLATION_MODEL` for that service.

Behaviour: provider interface in `src/lib/translate/`; 15-second timeout; replies validated with Zod; per-user rate limit (10/minute, 200/day) applied only to real provider calls; results cached 30 days in Redis (`translation:{provider}:en-fa:{hash}`) and shared between users; upstream errors are mapped to safe messages (the upstream body and your key are never forwarded or logged). The user's text is passed to the model as a JSON string, not as instructions.

## Redis data model

All keys are built in `src/lib/keys.ts`. `{uid}` is the user's UUID from the verified session.

| Key | Type | Content |
|---|---|---|
| `user:{uid}` | hash | id, email, name, passwordHash (bcrypt, cost 12), timezone, lang, theme, dailyGoal |
| `user:email:{email}` | string | uid. Claimed with `SET NX`, so emails are unique |
| `vocab:{id}` | hash | all word fields (lists as JSON), `ownerId`, counters, review state, `version` |
| `user:{uid}:vocabulary` | zset | id → createdAt (newest/oldest order, membership = "belongs to this user") |
| `user:{uid}:vocab:alpha` | zset | id → score from the first 10 letters (A–Z order) |
| `user:{uid}:vocab:practice` | zset | id → practiceCount |
| `user:{uid}:vocab:recent` | zset | id → lastPracticedAt |
| `user:{uid}:vocab:new` / `:mastered` | set | never practiced / level ≥ 5 |
| `user:{uid}:vocab:hard` | zset | id → struggle score (incorrect − 0.5 × correct, only when > 0) |
| `user:{uid}:review-queue` | zset | id → nextReviewAt (only words practiced at least once) |
| `user:{uid}:vocab:norm` | hash | normalized English → id (duplicate guard) |
| `user:{uid}:vocab:tokens` | zset (score 0) | `token\|id` members for prefix search |
| `user:{uid}:tag:{tag}`, `:difficulty:{d}`, `:collection:{cid}:items` | set | filter indexes |
| `user:{uid}:tags` | hash | tag → count (tag dropdown) |
| `collection:{id}`, `user:{uid}:collections`, `user:{uid}:collection-names` | hash / zset / hash | collection record, index, unique names |
| `user:{uid}:stats` | hash | attempts, correct, incorrect |
| `user:{uid}:daily`, `:daily-correct` | hash | `YYYY-MM-DD` (user's time zone) → counts |
| `user:{uid}:practiced:{day}` | set | ids practiced that day (expires after 100 days) |
| `user:{uid}:practice-history` | list | last 1000 answers as JSON |
| `translation:{provider}:{pair}:{hash}` | string | cached assistant result (30 days) |
| `idempotency:{uid}:{requestId}` | string | stored answer result (24 hours) |
| `ratelimit:{scope}:{id}` | string | fixed-window counters (login, translate, register, password) |
| `tmp:{uid}:{nonce}` | zset/set | short-lived working sets, deleted right after use, 60 s TTL as a safety net |

**Creating and updating.** *Create:* `HSETNX` on the normalized-text hash claims the word (atomic duplicate check), then one Lua script writes the record and every index. If that fails, the claim is released. *Update:* read the record, then one Lua script checks that `version` is unchanged, removes the old attribute indexes (tags, collection, difficulty, alphabetical score, search tokens), writes the new fields and indexes, and bumps `version`. If the version changed in between (another tab, a practice answer), it re-reads and retries (up to 4 times), then answers `409`.

**Ownership.** The user id only ever comes from the Auth.js session (`requireUserId`), never from the request. Every word read requires both `ownerId === uid` **and** membership in `user:{uid}:vocabulary`; a foreign or unknown id is `404`, so existence is not leaked. List queries only touch the caller's own keys. Collections follow the same rule. Pages and API routes each check the session on the server.

**Practice counts.** A completed answer = one call to `POST /api/practice/answer`. A single Lua script does, atomically: (1) return the stored result if `idempotency:{uid}:{requestId}` exists (retries and double-clicks replay, never recount); (2) verify the word's `version` still matches the state the new value was computed from; (3) `HINCRBY practiceCount 1` and the correct/incorrect counter, update last practiced, next review, level, indexes, daily and global stats, history; (4) store the result under the idempotency key. Correctness is judged on the server; the browser only sends the chosen or typed text. Opening a word, listing words and starting a session never write counters. The question's own UUID is used as the request id, so reloading and resubmitting is safe.

**Deletes.** One script removes the record and its entries from every index, the review queue, the difficult/mastered/new sets, the duplicate map, tag counts and search tokens. Deleting a collection moves its words to "No collection" (batched, skipping words that no longer exist).

**Pagination and search.** Pages use `ZRANGE … start stop [REV]` on the index that matches the sort. Filters are intersected inside Redis with `ZINTERSTORE … WEIGHTS 1 0 …` into a temporary key (the sort index supplies the order) and then paged; the "due" filter is built with `ZUNIONSTORE` + `ZREMRANGEBYSCORE`. Search tokenizes English, Persian (letter variants folded) and tags and does a lexicographic prefix scan (`ZRANGEBYLEX`, at most 2000 index entries per word typed) before intersecting; multi-word searches require every word. The library is never loaded to paginate or search. Practice sessions choose words the same way (`ZINTERSTORE`, `ZDIFFSTORE`, `ZRANDMEMBER`).

**Concurrency.** Atomic Lua scripts for every multi-key change, optimistic `version` checks with bounded retries (jittered back-off), `HSETNX`/`SET NX` claims for uniqueness, idempotency keys for answers.

## Spaced repetition

Seven-step ladder (level 0–6): 1 day, 3 days, 7 days, 14 days, 30 days, 60 days.

- Correct answer → level + 1 (max 6) and review after that step's interval. If 2 or more of the last 5 answers were wrong, the interval is halved.
- Wrong answer → level − 2 (min 0) and review again in **10 minutes**.
- Status: *new* (never practiced) → *due* (next review has passed) → *learning* → *mastered* (level ≥ 5).
- Sessions take overdue words first (oldest first), then difficult words, then random others. Hand-picked words and any collection can always be practiced manually.

Question quality: options never include a word that shares a meaning (comma-separated Persian meanings are compared individually), a listed synonym, or an identical definition with the correct answer, and options are unique. If fewer than two unambiguous options exist, the question becomes a typing question. Typing answers ignore case, extra spaces, trailing punctuation and a leading "to/a/an/the".

## Security notes

Server-side Zod validation on every input; bcrypt password hashing; HTTP-only Auth.js session cookies; same-origin check on all JSON write endpoints; login throttling (10 attempts / 15 min per email); registration, password-change and translation rate limits; CSV export neutralizes spreadsheet formulas; security headers; logs contain only error names, never request bodies, passwords, tokens or keys; correct status codes (`400/401/403/404/409/413/422/429/503`).

## Project structure

```
src/
  auth.ts                     Auth.js (credentials, JWT sessions)
  app/
    page.tsx                  landing
    (auth)/login, register    forms (server actions)
    (app)/                    dashboard, add, library, vocab/[id](+edit), practice,
                              collections, progress, settings   (session-guarded layout + per-page checks)
    api/                      vocab, collections, practice/{session,answer}, translate,
                              import, export, settings, auth
    actions.ts                login / register / logout / language+theme preference
  components/                 ui primitives, forms, practice runner, nav, dialogs
  lib/
    redis/                    client (Upstash), Lua helpers (atomic, guarded, rate window)
    vocab-repo.ts  collections-repo.ts  users-repo.ts  practice.ts  stats.ts
    questions.ts srs.ts csv.ts text.ts schemas.ts keys.ts i18n.ts api.ts
    translate/                provider interface, Gemini/OpenAI adapters, service
scripts/local-upstash-proxy.mjs   dev-only REST front for a local Redis
tests/                        Vitest suites (run against a real redis-server)
```

## Verification status

Run in the build environment: `eslint` clean · `tsc --noEmit` clean · **124 Vitest tests passing** · `next build` succeeds without any credentials · `npm audit --omit=dev`: 0 vulnerabilities. Tests cover vocabulary create/edit/delete and index cleanup, user isolation, protected pages and API routes, counters (correct/incorrect, retries, concurrent double-submits), review scheduling, session building, statistics, CSV import/export, translation errors/caching/rate limits, and empty states.

An HTTP smoke test also ran against the production server through the real `@upstash/redis` SDK (talking to a local Redis via `scripts/local-upstash-proxy.mjs`): login, wrong password, redirect of unauthenticated pages, cross-user `404`s, duplicate `409`, idempotent practice answers, Persian `dir="rtl"`, CSV export, cross-site write block, unconfigured translation message.

## Remaining limitations

- **Not yet run on real Upstash or Vercel.** The data layer was tested against Redis 7.0.15; the Lua scripts access keys that are not listed in `KEYS` (fine on standalone Redis, expected to be fine on Upstash). Please do the smoke test in "Deploy to Vercel" step 5 on your first deployment.
- **Translation providers were tested with mocked HTTP only**, not against live Gemini/OpenAI/Groq. Default model names may need updating via `TRANSLATION_MODEL`.
- **No browser/visual testing and no automated accessibility audit** was possible here; the UI was built for keyboard use, contrast and RTL but should be checked on real devices.
- Pronunciation audio comes from the browser's own English voices, so quality varies by device, it needs a browser with speech support (Chrome, Safari, Edge) and it was not tried on real devices here. The IPA text you save is shown but not used to generate sound.
- Voice typing uses the browser's SpeechRecognition (Chrome, Edge, Safari; hidden in Firefox). In Chrome the audio is processed by Google's speech service, so it needs internet and the browser asks for microphone permission. Accuracy for Persian and for rare English words varies; always check the text before saving. Not tried on real devices here.
- The pronunciation check measures whether the browser's speech recognizer understood each word (words are aligned in order, case and punctuation ignored, exact word match). It is a helpful guide, not an official pronunciation or accent score, and it can mis-hear numbers ("20" vs "twenty") or names. It needs a browser with SpeechRecognition (Chrome, Edge, Safari) and, in Chrome, an internet connection; the mode is disabled where unsupported. Not tried on real devices here.
- No password reset, email verification, or account deletion (there is no email service). Registration reveals whether an email is already registered.
- Search is word-prefix based over English, Persian and tags (not substring or fuzzy, and it does not search definitions or notes). A-Z order uses the first 10 characters. There is no "learning" review-status filter (the badge is shown on each word).
- CSV import accepts up to 300 rows and 1 MB per upload.
- Deleting a word leaves past totals in aggregate statistics and in the capped (1000-entry) practice history unchanged.
- `next-auth@5` is published under the `beta` tag (pinned in `package-lock.json`).
- Day boundaries for "today" and streaks use the time zone saved at registration (editable in Settings).
- `npm audit` (including dev tooling) reports advisories in development-only dependencies; none are in production dependencies.
