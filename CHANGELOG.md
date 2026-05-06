# Changelog

All notable changes to Privacy Mesh are documented here.

Format: [Semantic Versioning](https://semver.org) — MAJOR.MINOR.PATCH

---

## [0.1.0] — 2026-05-06

### Added

**Core interception**
- MV3 Chrome extension with content script injection on claude.ai, chat.openai.com, gemini.google.com
- Capture-phase submit interceptor (keyboard Enter + button click) with re-entry guard
- Long-lived port messaging (`chrome.runtime.connect`) to keep service worker alive during async PII scan
- Per-tab token map in `chrome.storage.session` (wiped on tab close)

**PII Detection Engine**
- Regex patterns for 9 types: EMAIL, PHONE, SSN, CREDIT_CARD, IP_ADDRESS, IP_ADDRESS_V6, DATE_OF_BIRTH, IBAN, PASSPORT, API_KEY
- Deterministic token anonymizer: `[EMAIL_01]`, `[SSN_01]`, etc.
- De-anonymizer for local token restoration (response display only)
- Response scanner: detects PII echo and token leakage in AI replies
- Semantic scrubber: flags indirect identifiers ("my boss Sarah", "I live in Austin")
- Synthetic replacement mode: realistic fake values instead of token placeholders
- Custom regex rules via settings page
- Domain allowlist (skip scan on specified domains)

**Browser UI (Shadow DOM)**
- PII badge: floating counter near textarea, color-coded by severity
- Sidebar panel (Alt+Shift+P): detection breakdown, token map, scan time
- Diff view: side-by-side raw vs sanitized with highlighted redactions
- High-risk banner: blocks submit for SSN, PASSPORT, IBAN, CREDIT_CARD
- Clipboard guard: intercepts paste events containing PII
- Response warning badge: alerts when AI output contains PII patterns

**Settings**
- Per-type detector toggles (12 types)
- Sensitivity presets: Strict / Balanced / Light
- Profiles: Work, Personal, Medical
- Custom regex rule builder
- Audit log with JSON export and 30-day auto-purge
- Power-user toggles: synthetic mode, timing jitter, semantic scrubbing

**Testing & Infrastructure**
- 80 Jest unit tests across 7 modules (anonymizer, deanonymizer, pii-detector, regex-rules, response-scanner, semantic-scrubber, synthetic-replacer)
- Playwright E2E scaffolding for all three platforms
- GitHub Actions CI: lint → test → build:dev → build:prod → verify dist
- Security audit: 0 npm vulnerabilities, all manifest checks green

---

[0.1.0]: https://github.com/vashishtavarma/mirage-extension/releases/tag/v0.1.0
