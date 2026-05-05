# Privacy Mesh — Browser Extension
## Development Plan v1.0

**Project:** Privacy Mesh  
**Type:** Browser Extension (Chrome MV3 + Firefox)  
**Goal:** Real-time PII interception between user and AI chat providers  
**Timeline:** 8 Weeks  
**Team Size:** 1–2 developers  
**Last Updated:** 2026-04-29

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Phase Breakdown](#5-phase-breakdown)
6. [Task Board](#6-task-board)
7. [File Structure](#7-file-structure)
8. [API & Integration Map](#8-api--integration-map)
9. [Security Constraints](#9-security-constraints)
10. [Performance Targets](#10-performance-targets)
11. [Testing Strategy](#11-testing-strategy)
12. [Release Plan](#12-release-plan)
13. [Risk Register](#13-risk-register)
14. [Open Decisions](#14-open-decisions)

---

## 1. Executive Summary

Privacy Mesh is a browser extension that sits as a transparent proxy layer between
the user's browser and any AI chat interface (Claude, ChatGPT, Gemini, Perplexity).

Before any prompt is sent, the extension:
1. Detects personally identifiable information (PII) using regex + local NLP
2. Replaces PII with safe tokens (`[EMAIL_01]`, `[NAME_01]`)
3. Forwards only the sanitized prompt to the AI provider
4. On response, restores any context tokens locally for user readability

**Everything runs locally. No data leaves the user's device unredacted. Zero telemetry.**

---

## 2. Problem Statement

### User Concern
Users interacting with AI providers (Claude, ChatGPT, Gemini) routinely include
sensitive information in their prompts: email addresses, phone numbers, names,
medical details, financial data. Providers may use this data for model training,
logging, or internal analytics.

### Current Gap
No browser-native tool exists that:
- Operates transparently without requiring users to manually clean their prompts
- Works across all major AI chat interfaces
- Runs fully locally without its own cloud backend
- Provides an auditable log of what was redacted and why

### Impact
If successful, Privacy Mesh solves this for every category of user:
- **Developers** copying code with internal API keys into AI chats
- **Healthcare workers** describing patient symptoms to AI assistants
- **Business users** pasting customer data into AI tools
- **General users** unaware that AI providers log their conversations

---

## 3. Solution Architecture

```
+----------------------------------------------------------+
|                      USER BROWSER                        |
|                                                          |
|  +---------------+     +------------------------------+  |
|  |  AI Chat UI   |     |   Privacy Mesh Extension     |  |
|  | (claude.ai,   |     |                              |  |
|  |  chatgpt.com  |<----+  Content Script              |  |
|  |  gemini.com)  |     |    - DOM Interceptor         |  |
|  +---------------+     |    - UI Layer                |  |
|         |              |      (badge, sidebar, diff)  |  |
|         | intercept    |                              |  |
|         v              |  Service Worker              |  |
|  +---------------+     |    - PII Detector            |  |
|  |  Raw Prompt   +---->|    - Anonymizer              |  |
|  +---------------+     |    - Token Store (session)   |  |
|                        |    - De-anonymizer           |  |
|                        |    - Response Scanner        |  |
|                        +------------------------------+  |
|                                    |                     |
|                     Sanitized      |                     |
|                     Prompt Only    v                     |
+----------------------------------------------------------+
                                |
                   +------------v-----------+
                   |      AI Provider       |
                   |  (receives zero PII)   |
                   +------------------------+
```

### Data Flow (per request)

```
User types prompt
      |
      v
Content script intercepts submit event (before network)
      |
      v
Message sent to Service Worker
      |
      v
PII Detector  -->  Regex scan + wink-nlp NER
      |
      v
Anonymizer    -->  Build token map { [NAME_01]: "John Smith" }
               -->  Replace PII with tokens
               -->  Store map in chrome.storage.session
      |
      v
Sanitized prompt injected back into submit flow
      |
      v
AI Provider receives clean prompt
      |
      v
Response received by content script
      |
      v
Response Scanner  -->  Check for PII echo in AI output
      |
      v
De-anonymizer  -->  Swap tokens back for user display (local only)
      |
      v
User sees contextualized, safe response
```

---

## 4. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Extension Framework | WebExtension API (MV3) | Chrome requirement; polyfilled for Firefox |
| Cross-browser Compat | `webextension-polyfill` | Single codebase for Chrome + Firefox |
| Content Scripts | Vanilla JavaScript | Zero dependency attack surface |
| NLP / NER | `wink-nlp` (WASM) | 100% local, 5MB, strong PERSON/ORG/LOC accuracy |
| Regex Engine | Native JS RegExp | No dependency; custom patterns per PII type |
| Build Tool | Webpack 5 | Code splitting, WASM support, multi-entry bundles |
| Testing (Unit) | Jest | PII engine coverage |
| Testing (E2E) | Playwright | DOM interception on live AI sites |
| Linting | ESLint + Prettier | Enforced on save |
| Package Manager | npm | Standard; lockfile committed |

---

## 5. Phase Breakdown

### Timeline Overview

```
Week 1   Week 2   Week 3   Week 4   Week 5   Week 6   Week 7   Week 8
  |--------|--------|--------|--------|--------|--------|--------|
  Phase 1--|        |        |        |        |        |        |
           Phase 2--|        |        |        |        |        |
                    Phase 3--|        |        |        |        |
                             Phase 4--|        |        |        |
                                      Phase 5--|        |        |
                                               Phase 6--|        |
                                                        Phase 7--|
```

---

### Phase 1 — Extension Scaffold (Week 1–2)

**Goal:** Skeleton extension that injects into AI chat UIs and intercepts submit events.

**Deliverables:**
- `manifest.json` — MV3 (Chrome), minimal host_permissions scoped to target domains
- `manifest.firefox.json` — Firefox MV2-compatible override
- Webpack 5 config with multi-entry (background, content, popup, settings)
- Service worker registered and messaging functional
- Content script injected on `claude.ai`, `chat.openai.com`, `gemini.google.com`
- `submit` event interceptor — hold prompt, wait for sanitization, release
- Message passing protocol: content script to/from service worker (typed messages)
- Dev mode with `npm run dev` (watch + reload)

**Exit Criteria:** Typing "test" in Claude and pressing Enter shows "intercepted" log
in the service worker console before the prompt is sent.

---

### Phase 2 — PII Detection Engine (Week 2–3)

**Goal:** Accurate, fast, local PII detection across 11 entity types.

**Deliverables:**

**Regex Layer** (`src/engine/patterns/regex-rules.js`)
- EMAIL — RFC 5322 compliant pattern
- PHONE — US/international formats, parentheses, dashes, spaces
- SSN — NNN-NN-NNNN format
- CREDIT_CARD — 16-digit patterns, major card formats
- IP_ADDRESS — IPv4 and IPv6
- DATE_OF_BIRTH — contextual ("born", "DOB", "birthday" + date)
- IBAN — ISO 13616 format
- PASSPORT — US and common international formats

**NLP Layer** (`src/engine/pii-detector.js`)
- `wink-nlp` loaded as WASM in service worker
- Named Entity Recognition: PERSON, ORGANIZATION, LOCATION
- Confidence scoring per detection (0–1)
- Low-confidence hits flagged for UI warning rather than auto-redaction

**Anonymizer** (`src/engine/anonymizer.js`)
- Deterministic token naming: `[EMAIL_01]`, `[NAME_01]`, `[PHONE_01]`
- Token map stored exclusively in `chrome.storage.session`
- Map TTL: cleared on tab close or browser session end

**De-anonymizer** (`src/engine/deanonymizer.js`)
- Lookup tokens in session map
- Replace in AI response text for user display only
- Never write de-anonymized content back to any storage

**Response Scanner** (`src/engine/response-scanner.js`)
- Detect if AI response echoes or reconstructs PII
- Flag hallucinated-but-real-looking PII patterns
- Surface warning in sidebar if detected

**Performance Target:** Full scan + anonymize < 80ms on prompts up to 4,000 tokens.

**Exit Criteria:** Prompt containing email + SSN returns sanitized version with tokens,
under 80ms measured in service worker.

---

### Phase 3 — Browser UI (Week 3–4)

**Goal:** Real-time visual feedback in the browser — unintrusive but informative.

**Deliverables:**

**PII Badge** (`src/content/ui/badge.js`)
- Floating counter attached to prompt textarea
- Shows: "3 items redacted" before send
- Color-coded: green (0 PII), amber (1–3), red (4+)
- Resets on next keystroke

**Sidebar Panel** (`src/content/ui/sidebar.js`)
- Toggled via extension icon or keyboard shortcut
- Shows: active layer in pipeline, token map for current session, security log
- Rendered in Shadow DOM to prevent CSS bleed from host page

**Diff View** (`src/content/ui/diff-view.js`)
- Toggle button: "Show sanitized version" before prompt is sent
- Side-by-side raw vs cleaned display
- Highlighted redactions with token labels

**High-Risk Banner**
- Full-width warning for SSN, PASSPORT, IBAN detection
- "Sensitive data detected. Mesh has redacted it. Proceed?"
- User can override and send original (logged to audit)

**Extension Popup** (`src/popup/`)
- Global on/off toggle
- Session stats: prompts processed, PII items caught
- Quick link to settings

**Exit Criteria:** Email in Claude textarea shows amber badge, sidebar shows layer
progress, diff view shows redacted version correctly.

---

### Phase 4 — Settings & Profiles (Week 4–5)

**Goal:** Full user control over sensitivity, rules, and audit history.

**Deliverables:**

**Settings Page** (`src/settings/`)
- Per-type PII toggle (disable any individual detector)
- Sensitivity slider with three presets:
  - **Strict**: redact all regex + all NER hits including medium confidence
  - **Balanced**: redact regex + high-confidence NER only (default)
  - **Light**: regex only, NER disabled
- Custom regex rules — user can add own patterns (e.g., employee IDs)
- Domain allowlist — skip mesh on specific domains (internal tools)

**Profiles**
- Work: all types on, strict sensitivity
- Personal: email + phone + SSN only
- Medical: all types on + custom medical ID patterns, strict
- Stored in `chrome.storage.sync` (cross-device)

**Audit Log**
- Full session log: timestamp, prompt hash (not content), PII types caught, count
- Stored in `chrome.storage.local`
- Export as JSON — one-click download
- Auto-purge after 30 days (configurable)

**Exit Criteria:** Disable EMAIL in settings, re-run email prompt, badge shows 0
redactions. Re-enable, badge shows redaction. Log entry exists for both.

---

### Phase 5 — Advanced Defenses (Week 5–6)

**Goal:** Harden against indirect leakage vectors that regex + NER miss.

**Deliverables:**

**Semantic Scrubbing**
- Detect indirect identifiers: "my daughter's school in Austin", "my boss Sarah"
- Flag for user review rather than auto-redact (configurable toggle)

**Metadata Normalization**
- Pad prompt length to nearest 256-token bucket
- Add timing jitter (±200ms) to submission
- Off by default, opt-in for high-security users

**Synthetic Replacement Mode (Power User)**
- Replace PII with realistic synthetic values instead of tokens
- Example: John Smith becomes Alex Turner (generated locally)
- Reverse map maintained in session for de-anonymization
- Off by default

**Clipboard Guard**
- Monitor paste events into AI textareas
- Warn on PII in pasted content before it reaches the textarea

**Enhanced Response Scanner**
- Compare AI response against all known PII types
- Log incidents to audit trail

**Exit Criteria:** Paste block of text with SSN into Claude, clipboard guard shows
warning before content enters textarea.

---

### Phase 6 — Testing & Hardening (Week 6–7)

**Goal:** Production-grade quality, security, and performance.

**Unit Tests (Jest)**

| Module | Test Cases | Targets |
|---|---|---|
| `pii-detector.js` | 500+ synthetic per type | FP < 2%, FN < 1% |
| `anonymizer.js` | Token determinism, edge cases | 100% token round-trip |
| `deanonymizer.js` | Partial matches, nested tokens | Correct restore |
| `response-scanner.js` | Echo detection, false positives | FP < 5% |

**E2E Tests (Playwright)**
- `tests/e2e/claude.spec.js` — intercept, badge, sidebar on claude.ai
- `tests/e2e/chatgpt.spec.js` — intercept on chat.openai.com
- `tests/e2e/gemini.spec.js` — intercept on gemini.google.com

**Security Audit Checklist**
- [ ] manifest.json — no broad host_permissions, scoped to target domains only
- [ ] Content scripts — no external network calls
- [ ] Token map — never written to sync or local storage
- [ ] Popup + Settings — strict CSP headers
- [ ] Injected UI — Shadow DOM prevents host page CSS/JS access
- [ ] XSS — all injected text escaped, no innerHTML with user data
- [ ] npm audit — zero high or critical vulnerabilities
- [ ] web-ext lint — passing with no errors

**Exit Criteria:** All unit tests pass, E2E suite passes on all three platforms,
security checklist 100% complete, all performance targets green.

---

### Phase 7 — Publish & Launch (Week 7–8)

**Goal:** Ship to Chrome Web Store + Firefox AMO + GitHub.

**Chrome Web Store**
- Store listing: title, description, 5 screenshots
- Privacy policy page (hosted)
- Permissions justification for each host_permissions entry
- Review turnaround: 3–7 business days

**Firefox AMO**
- Source code upload required for review
- `web-ext build` generates .xpi
- Review turnaround: 1–5 business days

**GitHub Open Source**
- License: MIT
- README: install guide, architecture diagram, contribution guide, FAQ
- GitHub Actions CI: lint → test → build on every PR
- Tagged semver releases with changelog

**Landing Page**
- Architecture explainer
- Install buttons (Chrome, Firefox)
- FAQ: "Does this send my data anywhere?" — No.

**Zero Telemetry Commitment**
- No analytics SDK
- No error reporting to external service
- No beacon on install/uninstall
- Stated explicitly in README, privacy policy, and store listing

---

## 6. Task Board

### Phase 1 Tasks
```
[P1-01] Init repo, Webpack 5 config, WebExtension Polyfill          4h
[P1-02] manifest.json MV3 (Chrome) with scoped host_permissions      1h
[P1-03] manifest.firefox.json override                               1h
[P1-04] Service worker skeleton + registration                       2h
[P1-05] Content script injection on claude.ai                        2h
[P1-06] Content script injection on chat.openai.com                  2h
[P1-07] Content script injection on gemini.google.com                2h
[P1-08] DOM submit event interceptor                                 3h
[P1-09] Message passing protocol (typed messages, validation)        3h
[P1-10] Dev mode: npm run dev with hot reload                        2h
```

### Phase 2 Tasks
```
[P2-01] Regex rules: EMAIL, PHONE, SSN, CREDIT_CARD                  3h
[P2-02] Regex rules: IP, DOB, IBAN, PASSPORT                         3h
[P2-03] wink-nlp WASM integration in service worker                  4h
[P2-04] PII detector: combine regex + NER with confidence scoring    4h
[P2-05] Anonymizer: token naming, map creation                       3h
[P2-06] Token store: chrome.storage.session wrapper with TTL         2h
[P2-07] De-anonymizer: session lookup + response restore             3h
[P2-08] Response scanner: PII echo detection                         3h
[P2-09] Unit tests: EMAIL patterns (100+ cases)                      2h
[P2-10] Unit tests: PHONE, SSN, CC, IP patterns                      4h
[P2-11] Unit tests: NER edge cases                                   3h
[P2-12] Performance benchmark: verify < 80ms @ 4000 tokens           2h
```

### Phase 3 Tasks
```
[P3-01] Badge: floating PII counter on textarea                      3h
[P3-02] Badge: color-coding by severity                              1h
[P3-03] Sidebar: Shadow DOM shell                                    2h
[P3-04] Sidebar: layer progress visualization                        4h
[P3-05] Sidebar: token map display                                   2h
[P3-06] Sidebar: security log                                        2h
[P3-07] Diff view: raw vs sanitized toggle                           4h
[P3-08] High-risk banner: SSN, PASSPORT, IBAN triggers               2h
[P3-09] Extension popup: on/off, stats, settings link                3h
```

### Phase 4 Tasks
```
[P4-01] Settings page: scaffold and navigation                       2h
[P4-02] Settings: per-type PII toggles                               3h
[P4-03] Settings: sensitivity slider (Strict/Balanced/Light)         2h
[P4-04] Settings: custom regex rule builder                          4h
[P4-05] Settings: domain allowlist                                   2h
[P4-06] Profiles: Work, Personal, Medical presets                    3h
[P4-07] Audit log: session recording to chrome.storage.local         3h
[P4-08] Audit log: JSON export                                       2h
[P4-09] Audit log: 30-day auto-purge                                 1h
```

### Phase 5 Tasks
```
[P5-01] Semantic scrubbing: indirect identifier detection             5h
[P5-02] Metadata normalization: length padding + timing jitter       4h
[P5-03] Synthetic replacement mode                                   5h
[P5-04] Clipboard guard: paste event monitor                         3h
[P5-05] Response scanner: enhanced with audit trail                  2h
```

### Phase 6 Tasks
```
[P6-01] Jest: full unit test suite, all modules                      8h
[P6-02] Playwright: claude.ai e2e spec                               4h
[P6-03] Playwright: chatgpt e2e spec                                 3h
[P6-04] Playwright: gemini e2e spec                                  3h
[P6-05] Security audit: full checklist                               4h
[P6-06] npm audit + dependency cleanup                               1h
[P6-07] web-ext lint: manifest + permissions                         1h
[P6-08] Performance validation: all targets                          2h
[P6-09] GitHub Actions CI pipeline                                   3h
```

### Phase 7 Tasks
```
[P7-01] Chrome Web Store listing assets                              4h
[P7-02] Privacy policy page                                          2h
[P7-03] Chrome Web Store submission                                  1h
[P7-04] Firefox AMO build + submission                               2h
[P7-05] GitHub README + CONTRIBUTING.md                              3h
[P7-06] GitHub Releases setup + changelog                            1h
[P7-07] Landing page                                                 5h
```

**Total Estimate:** ~145 hours (solo developer, 8 weeks at ~18h/week)

---

## 7. File Structure

```
privacy-mesh/
├── PLAN.md
├── README.md
├── CONTRIBUTING.md
├── LICENSE                              (MIT)
├── package.json
├── webpack.config.js
├── .eslintrc.json
├── .gitignore
|
├── manifest.json                        (Chrome MV3)
├── manifest.firefox.json                (Firefox MV2 override)
|
├── src/
|   ├── background/
|   |   ├── service-worker.js            (MV3 service worker / coordinator)
|   |   ├── token-store.js               (chrome.storage.session wrapper)
|   |   └── permissions.js               (extension permission logic)
|   |
|   ├── content/
|   |   ├── interceptor.js               (main entry; loads platform + UI)
|   |   ├── platforms/
|   |   |   ├── claude.js                (DOM selectors for claude.ai)
|   |   |   ├── chatgpt.js               (DOM selectors for chat.openai.com)
|   |   |   ├── gemini.js                (DOM selectors for gemini.google.com)
|   |   |   └── index.js                 (platform registry + auto-detection)
|   |   └── ui/
|   |       ├── badge.js                 (PII count badge)
|   |       ├── sidebar.js               (layer status + token map panel)
|   |       ├── diff-view.js             (raw vs sanitized toggle)
|   |       ├── banner.js                (high-risk warning banner)
|   |       └── styles.css               (extension UI styles, Shadow DOM)
|   |
|   ├── engine/
|   |   ├── pii-detector.js              (orchestrates regex + NER)
|   |   ├── anonymizer.js                (PII to token replacement)
|   |   ├── deanonymizer.js              (token to PII restore, local only)
|   |   ├── response-scanner.js          (scans AI output for PII echo)
|   |   └── patterns/
|   |       ├── regex-rules.js           (built-in patterns, 11 types)
|   |       └── custom-rules.js          (user-defined patterns loader)
|   |
|   ├── popup/
|   |   ├── popup.html
|   |   ├── popup.js
|   |   └── popup.css
|   |
|   └── settings/
|       ├── settings.html
|       ├── settings.js
|       └── settings.css
|
├── tests/
|   ├── unit/
|   |   ├── pii-detector.test.js
|   |   ├── anonymizer.test.js
|   |   ├── deanonymizer.test.js
|   |   └── response-scanner.test.js
|   ├── e2e/
|   |   ├── claude.spec.js
|   |   ├── chatgpt.spec.js
|   |   └── gemini.spec.js
|   └── fixtures/
|       └── pii-samples.json             (500+ synthetic PII test cases)
|
├── .github/
|   └── workflows/
|       └── ci.yml                       (lint > test > build > pack)
|
└── docs/
    ├── architecture.md
    ├── security-model.md
    └── adding-a-platform.md
```

---

## 8. API & Integration Map

### Chrome Extension APIs Used

| API | Purpose | Storage Scope |
|---|---|---|
| `chrome.storage.session` | Token map (PII to token), per-session | Ephemeral |
| `chrome.storage.local` | Audit log, cached settings | Persistent, local |
| `chrome.storage.sync` | User preferences, profiles | Synced across devices |
| `chrome.runtime.sendMessage` | Content script to/from service worker | In-memory |
| `chrome.tabs.onRemoved` | Clear session token map on tab close | Event |
| `chrome.action` | Extension popup trigger | UI |

### npm Dependencies

| Package | Purpose |
|---|---|
| `webextension-polyfill` | Chrome/Firefox API unification |
| `wink-nlp` | Local NER (PERSON, ORG, LOC) |
| `webpack` + `webpack-cli` | Build, code splitting |
| `copy-webpack-plugin` | Static assets (HTML, CSS, icons) |
| `jest` | Unit tests |
| `@playwright/test` | E2E tests |
| `web-ext` | Manifest validation + Firefox packaging |
| `eslint` + `prettier` | Linting and formatting |

### Zero External Network Calls
The extension makes no external network calls from its own code.
All outbound requests are the original AI platform requests, unchanged except
for the sanitized prompt content. No backend, no API, no analytics endpoint.

---

## 9. Security Constraints

### Hard Rules

```
NEVER:
  Store PII in chrome.storage.local or chrome.storage.sync
  Make network requests from content scripts or the service worker
  Log raw prompt content anywhere (hash only for audit trail)
  Use broad host_permissions like *://*/*
  Write innerHTML with unsanitized user data
  Bundle third-party scripts that make external calls

ALWAYS:
  Scope token map to chrome.storage.session only
  Use Shadow DOM for injected UI elements
  Escape all text before DOM injection
  Set strict CSP on popup.html and settings.html
  Validate all messages between content script and service worker
  Scope host_permissions to exact AI platform domains only
```

### host_permissions (scoped to minimum)
```json
{
  "host_permissions": [
    "https://claude.ai/*",
    "https://chat.openai.com/*",
    "https://gemini.google.com/*"
  ]
}
```

### Content Security Policy (popup + settings pages)
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

---

## 10. Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| PII scan + anonymize (4,000 tokens) | < 80ms | Jest benchmark |
| PII scan + anonymize (1,000 tokens) | < 20ms | Jest benchmark |
| wink-nlp WASM cold load | < 300ms | Service worker activation |
| Service worker cold start | < 200ms | chrome.runtime event timing |
| Extension idle memory | < 5MB | Chrome Task Manager |
| Regex false positive rate | < 2% | Fixture validation |
| NER false negative rate (explicit PII) | < 1% | Fixture validation |
| UI badge render latency | < 16ms | requestAnimationFrame timing |

---

## 11. Testing Strategy

### Unit Testing (Jest)

**Test Data** (`tests/fixtures/pii-samples.json`): 500+ cases per PII type,
split evenly between true positives and true negatives.

**Coverage Requirements:**
- Minimum 500 test cases per PII type
- 90%+ line coverage on all engine modules
- 100% branch coverage on anonymizer token assignment

### E2E Testing (Playwright)

Playwright loads the extension into real Chromium using `--load-extension`.
Test scenarios per platform (claude, chatgpt, gemini):

1. Basic interception — email in prompt → badge shows 1 redaction
2. Multiple PII types — email + phone + name → badge shows 3
3. High-risk trigger — SSN → banner appears
4. Settings respected — disable EMAIL → no redaction for email prompt
5. Sidebar shows correct token map for current session
6. Diff view shows correct redactions highlighted

### CI Pipeline (GitHub Actions)

```yaml
on: [push, pull_request]
jobs:
  ci:
    steps:
      - npm ci
      - npm run lint
      - npm test
      - npm run build
      - npm run validate:manifest
      - npm run pack:chrome
      - npm run pack:ff
```

---

## 12. Release Plan

### Versioning
Semantic versioning: MAJOR.MINOR.PATCH

- MAJOR: breaking change to token format or storage schema
- MINOR: new PII type, new platform, new settings feature
- PATCH: bug fix, false positive/negative improvement

### v0.1.0 — Internal Alpha (End of Phase 6)
- Chrome only
- Core PII detection: 8 regex types
- Basic badge + sidebar UI
- Settings: on/off, per-type toggles
- Manual install via chrome://extensions (unpacked)

### v0.2.0 — Public Beta (Start of Phase 7)
- Firefox support added
- wink-nlp NLP layer active
- Full settings page + profiles
- Audit log with JSON export
- Chrome Web Store listing (review pending)

### v1.0.0 — General Availability
- Both Chrome and Firefox stores approved
- Full E2E test suite passing
- Security audit complete
- Open source on GitHub (MIT)
- Landing page live

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI platform changes textarea DOM structure | High | High | Platform adapters isolated in their own files; selectors monitored in CI |
| MV3 service worker lifecycle clears token map mid-session | Medium | High | Use chrome.storage.session; re-request on worker restart |
| wink-nlp WASM size causes Chrome Web Store rejection | Low | Medium | Pre-compress WASM; lazy-load only when NLP needed |
| Chrome Web Store rejects extension over permissions concerns | Medium | High | Justify each host_permission in submission; prepare appeal |
| High false positive rate annoys users | High | Medium | Sensitivity slider defaults to Balanced; one-click override |
| Firefox MV3 support gaps | Low | Low | Firefox uses MV2 manifest override; tested separately |
| AI platforms change login flow breaking E2E tests | Medium | Low | E2E tests are advisory; unit tests are the quality gate |
| Semantic scrubbing causes excessive false positives | Medium | Medium | Feature is off by default; extensive testing before enabling |

---

## 14. Open Decisions

Resolve before Phase 2 begins.

**1. Token mode vs Synthetic replacement — which is the default?**
- Tokens (`[NAME_01]`) are safer but slightly degrade AI coherence
- Synthetic names (`Alex Turner`) maintain coherence but are harder to reverse
- Recommendation: Token mode as default. Synthetic as opt-in power user feature.
- Validate: run 50 prompts through both modes, compare AI response quality

**2. wink-nlp vs compromise.js**
- wink-nlp: 5MB, NER accuracy ~92%, runs as WASM
- compromise.js: 200KB, NER accuracy ~78%, pure JavaScript
- Decision gate: if compromise.js false negative rate exceeds 1.5% on fixture set, use wink-nlp
- Default recommendation: wink-nlp (accuracy is the product)

**3. Chrome first or parallel development?**
- Recommendation: Chrome first. Ship v0.1.0 Chrome only. Add Firefox in v0.2.0.
- Parallel development doubles QA surface in Phase 6 without proportional alpha benefit.

**4. Open source from day 1?**
- Strong recommendation: Yes, MIT license, public from first commit.
- Rationale: A privacy product's credibility is proportional to its auditability.
  Users will not trust a black box claiming to protect their data.

---

*Privacy Mesh Development Plan v1.0 — 2026-04-29*