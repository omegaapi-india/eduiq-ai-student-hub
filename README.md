# EduIQ — AI Student Hub

**Live demo:** https://eduiq.pages.dev/

**Built by Krishna Prakash Ojha (Leon) — OmegaAPI:** https://omegaapi.com

EduIQ is one free, privacy-safe workspace with eight AI-themed student demos. It runs on Cloudflare Pages, needs no API key, stores no student text, and uses readable deterministic engines instead of a paid model. An optional local open LLM can refine the explanation on your own machine.

> **Important:** Every output is a learning aid, not academic, career, startup, or financial advice. There is no payment, no account, no brokerage, and no real-world submission.

## Why this project

Student-facing AI tools are usually demos of a paid API key. EduIQ takes the opposite route: the logic is visible, the data stays in the browser, and the only optional model runs through a localhost bridge. It is fast enough to present live, simple enough to teach, and clean enough to publish.

## Eight tools in one hub

| Tool | What it does |
|---|---|
| **StudyIQ** | Turns subjects and an exam date into an hour plan, spaced revision days, and an instant quiz. |
| **PlacementIQ** | Role-based mock questions, a timer, and a transparent answer rubric. |
| **ResumeIQ** | ATS-style structure review, action verbs, measurable impact, and keyword gaps. No upload. |
| **CodeMentor** | Readability and hygiene review for pasted code, with no code echoed back. |
| **ResearchIQ** | Abstract summary plus problem, method, result, and limitation checks. |
| **CampusIQ** | Local search over your notes and a small built-in campus FAQ. |
| **SparkIQ** | Student startup idea screening across problem, audience, uniqueness, scope, and test plan. |
| **GreenIQ** | Campus carbon estimate from commute, energy, and waste inputs with practical tips. |

## Features

- **Local-first analysis.** All eight engines are plain JavaScript modules imported by the browser.
- **No data collection.** Resumes, code, notes, and answers are never uploaded or stored by the demo.
- **Redacted prompts.** The optional LLM only receives computed highlights after contact patterns are removed.
- **Optional open LLM.** Ollama runs locally through `llama3.2`, `mistral`, or `qwen2.5`.
- **Clear fallback.** If Ollama is not running, the readable rule-engine explanation is shown instead.
- **Signed three-day trial.** No payment layer; access is a simple privacy-safe demo window.
- **Strict headers.** CSP, `nosniff`, `DENY` framing, no-referrer, and `payment=()`.
- **Optional free account layer.** Cloud-save redacted notes with a random handle and passphrase. No email, phone, or profile. The local demo still works with no account.
- **Simple support options.** The in-app section offers a repo star, a short note, or a Telegram message. Nothing is ever locked or paywalled.
- **Zero third parties.** No CDN fonts, analytics, cookies, trackers, or chat buttons.

## Architecture

```text
Browser UI
   |
   ├── imports /lib/engines.js ──► deterministic local analysis
   ├── imports /lib/prompt.js ───► redacted, computed prompt
   ├── GET  /api/health ─────────► Pages Function status
   ├── GET  /api/tools  ─────────► public tool metadata
   ├── /api/account/* ──────────► optional D1 workspace (handle + passphrase only)
   └── POST http://127.0.0.1:8788/api/explain ──► local bridge ──► local Ollama model

Saved notes ──► browser localStorage by default
Optional sync ──► redacted notes only, to the student's own D1 workspace
Student text ──► never sent to a paid service
```

## Quick start

```bash
npm install
npm test
npm run dev
```

Open http://127.0.0.1:8787/.

### Run the optional local open LLM

Install Ollama, pull an open model, and start the bridge:

```bash
ollama pull llama3.2
npm run bridge
```

Then keep **Use local open LLM** enabled in the demo. The reasoning panel will show `Local llama3.2` when the bridge and Ollama are reachable. Otherwise it shows `Rule engine (offline)` and the app keeps working.

Bridge environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `BRIDGE_PORT` | `8788` | Localhost bridge port |
| `OLLAMA_MODEL` | `llama3.2` | Open model tag to use |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint |

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Demo status and architecture |
| `GET` | `/api/tools` | Public tool metadata |
| `POST` | `/api/account/register` | Create a free workspace, signed session cookie |
| `POST` | `/api/account/login` | Sign in with handle and passphrase |
| `GET` | `/api/account/me` | Current session status |
| `GET` / `POST` | `/api/account/notes` | Load or save redacted notes |
| `POST` | `/api/account/logout` | Clear the session cookie |
| `POST` | `http://127.0.0.1:8788/api/explain` | Local LLM refinement, optional |

Examples:

```bash
curl -H "Cookie: eduiq_trial=YOUR_COOKIE" https://eduiq.pages.dev/api/health
```

```bash
curl -X POST http://127.0.0.1:8788/api/explain \
  -H 'content-type: application/json' \
  -d '{"prompt":"Explain this result in five short bullets."}'
```

The eight analysis engines are intentionally browser-side, so there is no `/api/analyze` route that accepts student text.

## Demo access and data safety

Every public demo is a **3-day free trial**. Access is enforced by a signed, HttpOnly cookie issued by a Cloudflare Pages Function. There is no payment form, card field, subscription, or paid API key in any demo.

The cookie contains only a timestamp and a random nonce. No IP address, name, email address, phone number, or student input is stored in it. Clearing browser cookies starts a fresh trial; a commercial deployment should add accounts and billing for hard entitlement control.

Local development and deployment need one extra secret:

```bash
# add to .dev.vars
DEMO_TRIAL_SECRET=replace-with-a-long-random-string

# upload for production
npx wrangler pages secret bulk .dev.vars --project-name eduiq
```

The `.dev.vars` file is gitignored and is never committed.

## Optional account layer

The eight tools are fully usable with no account. The optional workspace only syncs **redacted saved notes**, so a student can continue on another browser without giving any personal detail.

- Identity is a random handle such as `EIQ-7Q2M-9K4P` plus a passphrase.
- No email address, phone number, name, or profile is collected.
- Passphrases are salted and hashed with PBKDF2-SHA256 (100,000 iterations, the Workers-supported maximum).
- Sessions are signed HMAC cookies with `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS, and a 30-day lifetime.
- Only the eight most recent redacted notes are stored, max 20 KB per workspace.
- Passphrases cannot be recovered. This is intentional for a privacy-first demo.

The free D1 database is already bound in `wrangler.toml`. To recreate it in another account:

```bash
npx wrangler d1 create eduiq-accounts
npx wrangler d1 execute eduiq-accounts --remote --file=migrations/0001_init.sql
```

Add this extra secret to `.dev.vars` and upload it with the trial secret:

```bash
ACCOUNT_SESSION_SECRET=replace-with-another-long-random-string
npx wrangler pages secret bulk .dev.vars --project-name eduiq
```

## Tests

```bash
npm test
```

The suite covers all eight engines, deterministic output, score ranges, redaction of contact patterns, safe prompts, API metadata, and the signed-cookie trial behaviour.

## Screenshots

| File | What it shows |
|---|---|
| `screenshots/01-hub.png` | Landing view and eight-tool workspace |
| `screenshots/02-study-plan.png` | StudyIQ plan, revision, and quiz |
| `screenshots/03-resume-review.png` | ResumeIQ review with redacted output |
| `screenshots/04-interview-score.png` | PlacementIQ rubric and answer score |

## Deployment

The live demo was deployed manually:

```bash
npm test
npm run deploy
```

An optional GitHub Actions workflow is included as `docs/github-actions-deploy.yml.example`. Copy it to `.github/workflows/deploy.yml` to run tests and deploy on every push to `main`. Creating workflow files requires a GitHub token with the `workflow` scope.

The workflow expects these encrypted repository secrets if enabled:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Project structure

```text
assets/                 Browser UI, styles, config, and app flow
bridge/                 Localhost-only Ollama bridge
docs/                   Optional deployment workflow template
functions/api/          Health, tools, and optional account routes
functions/_middleware.js  Signed three-day trial lock
lib/                    Eight engines, prompt builder, and account helpers
migrations/             Free D1 schema for optional cloud sync
screenshots/            Portfolio captures
tests/                  Node test suite
_headers                CSP and security headers
wrangler.toml           Pages project configuration
```

## Contact for a custom build

Want this adapted for a real student portal, placement cell, or internal learning dashboard?

- Email: **info@omegaapi.com**
- Telegram: **https://t.me/Omegaapiofficial**
- Portfolio: **https://omegaapi.com**

## ❤️ Sponsor this project

If EduIQ saves you time or helps your studies, please consider sponsoring OmegaAPI. It keeps the live demo online and lets me keep building free, open-source tools.

[![Sponsor OmegaAPI](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/omegaapi-india)

Goal: **10 monthly sponsors**. [View monthly tiers ($5, $25, $100, $250)](https://github.com/sponsors/omegaapi-india?interval=monthly). Every monthly sponsor helps. Can't sponsor? A ⭐ on this repo or sharing it with someone who needs it helps too!

## License

MIT — see [LICENSE](LICENSE). Copyright © 2026 Krishna Prakash Ojha (Leon), OmegaAPI.
