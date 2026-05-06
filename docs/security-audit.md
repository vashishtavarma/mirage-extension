# Security Audit Checklist

Completed: 2026-05-06

## Manifest

- [x] `manifest_version: 3` — Chrome MV3
- [x] `host_permissions` scoped to exact domains only (`claude.ai`, `chat.openai.com`, `gemini.google.com`)
- [x] No broad `*://*/*` permissions
- [x] CSP defined: `default-src 'self'; script-src 'self'; style-src 'self'`
- [x] No `unsafe-eval` or `unsafe-inline` in CSP

## Data Storage

- [x] Token map stored **only** in `chrome.storage.session` (wiped on tab/session close)
- [x] Token map **never** written to `chrome.storage.sync` or `chrome.storage.local`
- [x] Audit log stores prompt hash only — no raw prompt content
- [x] Session stats stored in `chrome.storage.local` (counts only, no content)

## Network

- [x] Zero external network calls from extension code
- [x] No `fetch()` or `XMLHttpRequest` in content scripts or service worker
- [x] All outbound requests are the user's own AI platform requests (unmodified except prompt content)
- [x] `chrome.storage.session` never crosses device (session-scoped by definition)

## DOM Injection

- [x] All injected UI rendered in **Shadow DOM** (`attachShadow({ mode: 'open' })`) — 6 components
- [x] Shadow DOM prevents host page CSS/JS from bleeding into extension UI
- [x] All user-controlled strings escaped via `escHtml()` before DOM insertion
- [x] No `innerHTML` with raw user data — all dynamic content sanitized

## Vulnerabilities

- [x] `npm audit` — **0 vulnerabilities** (0 high, 0 critical)
- [x] No `eval()` or `new Function()` usage
- [x] No `document.write()`

## Permissions Justification

| Permission | Reason |
|---|---|
| `storage` | Settings (sync), audit log (local), token map (session) |
| `tabs` | Clear token map on tab close; detect active tab in popup |
| `https://claude.ai/*` | Content script injection |
| `https://chat.openai.com/*` | Content script injection |
| `https://gemini.google.com/*` | Content script injection |
