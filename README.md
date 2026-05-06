# Privacy Mesh

**Real-time PII redaction between you and AI chat providers.**  
Everything runs locally. No data leaves your device unredacted. Zero telemetry.

[![CI](https://github.com/vashishtavarma/mirage-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/vashishtavarma/mirage-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What It Does

Privacy Mesh sits as a transparent proxy between your browser and any AI chat interface. Before any prompt is sent, it:

1. Detects PII using regex patterns + optional NER
2. Replaces it with safe tokens — `[EMAIL_01]`, `[SSN_01]`
3. Forwards only the sanitized prompt to the AI provider
4. Restores tokens locally so you can read the full response

**Supported platforms:** Claude (claude.ai) · ChatGPT (chat.openai.com) · Gemini (gemini.google.com)

---

## Architecture

```
User types prompt
      │
      ▼
Content script intercepts submit (capture phase)
      │
      ▼ chrome.runtime.connect (long-lived port)
Service Worker
  ├── Domain allowlist check
  ├── PII Detector (regex × 9 types + optional NER)
  ├── Anonymizer → token map → chrome.storage.session
  ├── Semantic scrubber (indirect identifiers)
  └── Audit log (hash only, no raw content)
      │
      ▼
Sanitized prompt injected back → AI provider sees zero PII
      │
      ▼
Response watcher scans AI output for PII echo
      │
      ▼
De-anonymizer restores tokens locally for user display
```

---

## PII Types Detected

| Type | Example | Confidence |
|---|---|---|
| Email | `user@example.com` | High |
| Phone | `(555) 123-4567`, `+44 20 7946 0958` | High |
| SSN | `123-45-6789` | High |
| Credit Card | `4111 1111 1111 1111` | High |
| IP Address | `192.168.1.1`, IPv6 | High |
| Date of Birth | `DOB: 01/15/1990` | High |
| API Key | `sk-…`, `ghp_…`, `github_pat_…` | High |
| IBAN | `GB29NWBK60161331926819` | Medium |
| Passport | `AB1234567` | Medium |
| Person (NER) | `John Smith` | High (context-dependent) |
| Organization (NER) | `Acme Corp` | High |
| Location (NER) | `Austin, TX` | High |

---

## Install (Developer Mode)

### Chrome / Edge

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/vashishtavarma/mirage-extension.git
   cd mirage-extension
   npm install
   npm run build:dev
   ```
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `mirage-extension/` folder
5. Open `claude.ai`, `chat.openai.com`, or `gemini.google.com` and start chatting

### Firefox

```bash
npm run pack:ff
# Install the generated .xpi via about:addons → Install Add-on From File
```

---

## Features

### Core
- **Transparent interception** — prompts are sanitized before the Enter key or Send button completes
- **Token map** — per-tab, session-scoped (`chrome.storage.session`), wiped on tab close
- **Fail-open** — if the service worker is unreachable, the original prompt is sent unchanged

### UI (all Shadow DOM — no CSS conflicts)
- **PII Badge** — floating counter near the textarea: `🔒 2 items redacted`
- **Sidebar** — slide-in panel (`Alt+Shift+P`) with detection breakdown + token map
- **Diff View** — side-by-side raw vs sanitized comparison
- **High-Risk Banner** — blocks submit for SSN, PASSPORT, IBAN, CREDIT_CARD with "Send Redacted ✓" / "Send Original"
- **Clipboard Guard** — warns on PII in pasted content before it enters the editor

### Settings
- Per-type detector toggles
- Sensitivity presets: Strict / Balanced (default) / Light
- **Profiles**: Work, Personal, Medical
- Custom regex rules (e.g. employee IDs)
- Domain allowlist (skip mesh on internal tools)
- Audit log with JSON export, 30-day auto-purge

### Power User (off by default)
- **Synthetic Replacement** — sends `taylor42@example.com` instead of `[EMAIL_01]`
- **Timing Jitter** — adds 50–250ms random delay to resist timing analysis
- **Semantic Scrubbing** — flags indirect identifiers ("my boss Sarah", "I live in Austin")

---

## Development

```bash
npm run dev          # Watch mode (rebuilds on save)
npm run build:dev    # One-shot development build
npm run build        # Production build (minified)
npm test             # Jest unit tests (80 tests)
npm run test:coverage # Coverage report
```

### Project Structure

```
src/
  background/       Service worker, token store, audit log
  content/          Interceptor, platform adapters, UI components
  engine/           PII detector, anonymizer, de-anonymizer, scanners
  shared/           Message types + port-based messaging
  popup/            Extension popup
  settings/         Full settings page
tests/
  unit/             Jest tests for all engine modules
  e2e/              Playwright specs (require live AI accounts)
  fixtures/         Synthetic PII test data
```

---

## Privacy Commitment

- **Zero telemetry** — no analytics SDK, no error reporting, no install/uninstall beacon
- **No backend** — the extension makes zero external network calls of its own
- **Session-scoped tokens** — PII→token map lives only in `chrome.storage.session`, wiped on tab close
- **Audit log** — stores prompt hash + metadata only, never raw content
- **Open source** — MIT licensed, fully auditable

---

## Adding a Platform

See [docs/adding-a-platform.md](docs/adding-a-platform.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
