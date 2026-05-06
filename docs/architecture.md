# Privacy Mesh — Architecture

## Overview

Privacy Mesh is a Chrome MV3 / Firefox MV2 browser extension with three distinct execution contexts:

| Context | File | Has DOM? | Has `chrome.*`? |
|---|---|---|---|
| Service Worker | `src/background/` | No | Yes |
| Content Script | `src/content/` | Yes | Partial |
| Extension Pages | `src/popup/`, `src/settings/` | Yes | Yes |

---

## Data Flow

```
User types → textarea (contenteditable or <textarea>)
                │
                │ keydown Enter / click (capture phase)
                ▼
        interceptor.js (content script)
                │
                │ chrome.runtime.connect() — long-lived port
                │ MSG.SANITIZE_PROMPT { prompt }
                ▼
        service-worker.js
                │
                ├── domain allowlist check → skip if allowlisted
                ├── detectPII(prompt, settings)
                │     ├── Regex layer (REGEX_RULES × 9 types)
                │     └── NER layer (wink-nlp, skipped in SW — needs DOM)
                ├── anonymize(prompt, detections) → { sanitized, tokenMap }
                │     OR syntheticReplace(prompt, detections) if enabled
                ├── semanticScrub(prompt) → indirect identifier hints
                ├── mergeTokenMap(tabId, tokenMap) → chrome.storage.session
                ├── incrementStats() → chrome.storage.local
                └── logScan() → chrome.storage.local (hash + metadata only)
                │
                │ { sanitizedPrompt, piiCount, detections, semanticHits }
                ▼
        interceptor.js (content script)
                │
                ├── updateBadge(piiCount)
                ├── updateSidebar({ detections, tokenMap, semanticHits })
                ├── showHighRiskBanner() if SSN/PASSPORT/IBAN/CC → await user
                ├── platform.setPromptText(textarea, sanitizedPrompt)
                └── dispatchEnter(textarea) → AI platform submits
                │
                ▼
        AI Provider (receives zero PII)
                │
                ▼
        response-watcher.js (MutationObserver)
                │
                │ MSG.SCAN_RESPONSE { responseText }
                ▼
        service-worker.js → scanResponse(responseText, tokenMap)
                │
                └── warnings → sidebar + response warning badge
```

---

## Key Design Decisions

### Long-lived ports instead of sendMessage

`chrome.runtime.sendMessage` can't keep a service worker alive during async operations. If the SW is killed mid-response (e.g. during wink-nlp load), the message port closes. We use `chrome.runtime.connect()` to establish a persistent port that pins the SW alive for the duration of each call.

### Token map in `chrome.storage.session` only

Session storage is scoped to the browser session and cleared when tabs close. This ensures PII→token mappings are never persisted to disk, never synced across devices, and can't be accessed by other extensions.

### Shadow DOM for all injected UI

All UI components (badge, sidebar, banner, diff view, clipboard guard, response watcher) attach a Shadow DOM to their host element. This prevents host page CSS from bleeding into the extension UI and prevents extension CSS from polluting the host page.

### Capture-phase event interception

Submit events are caught in the `capture` phase (third argument `true` to `addEventListener`). This fires before the platform's own handlers, giving us control before React/ProseMirror processes the event. The `isProcessing` guard prevents re-entry when we re-dispatch synthetic events to complete the submit.

### Regex-only in service worker (no DOM)

`wink-nlp`'s English model references `document` during initialization, which doesn't exist in an MV3 service worker. The regex layer runs in the SW; NER would need to run in the content script context (future work).

---

## Storage Schema

```
chrome.storage.session
  token_map_tab_{tabId}   { '[EMAIL_01]': 'user@example.com', ... }

chrome.storage.local
  session_stats           { promptsProcessed: N, piiCaught: N }
  audit_log               [{ id, timestamp, promptHash, promptLength,
                              piiTypes, piiCount, elapsedMs, domain }]

chrome.storage.sync
  settings                { enabled, sensitivity, detectors, profiles, ... }
  customRules             [{ type, pattern, confidence }]
  domainAllowlist         ['internal.company.com', ...]
```

---

## Build

Webpack 5 with four entry points:

| Entry | Output | Purpose |
|---|---|---|
| `src/background/service-worker.js` | `dist/background.js` | MV3 service worker |
| `src/content/interceptor.js` | `dist/content.js` | Content script |
| `src/popup/popup.js` | `dist/popup.js` | Extension popup |
| `src/settings/settings.js` | `dist/settings.js` | Settings page |

wink-nlp is code-split into separate vendor chunks by Webpack's automatic chunk splitting.
