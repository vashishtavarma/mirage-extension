# Privacy Mesh — Privacy Policy

**Effective date:** 2026-05-06  
**Extension:** Privacy Mesh  
**Developer:** vashishtavarma

---

## What Privacy Mesh Does

Privacy Mesh is a browser extension that detects and redacts personally identifiable information (PII) from prompts you send to AI chat providers, before those prompts leave your browser.

---

## Data We Collect

**Privacy Mesh collects nothing.**

Specifically:

| Data type | Collected? | Details |
|---|---|---|
| Your prompts | No | Never stored, transmitted, or logged |
| PII you type | No | Detected locally and replaced with tokens |
| Browsing history | No | Extension only activates on three AI domains |
| Account information | No | No login, no account |
| Usage analytics | No | Zero telemetry, no analytics SDK |
| Crash reports | No | No external error reporting |

---

## How Data Is Handled Locally

**Token map** (`chrome.storage.session`)  
When PII is detected, a map of token → original value is stored in your browser's session storage. This is scoped to a single browser tab and is automatically wiped when the tab closes or the browser session ends. It is never synced across devices.

**Audit log** (`chrome.storage.local`)  
A local audit log stores: timestamp, the hostname of the AI site, PII types detected (e.g. "EMAIL", "SSN"), and PII count. It stores a hash of your prompt — not the prompt content itself. This data never leaves your device. You can export or delete it at any time via the Settings page.

**User settings** (`chrome.storage.sync`)  
Your settings (sensitivity level, enabled detectors, custom rules) are synced across your Chrome devices via your Google account, using Chrome's built-in sync. Privacy Mesh itself has no access to this sync channel.

---

## Network Activity

Privacy Mesh makes **zero network requests** of its own.

The only network traffic associated with Privacy Mesh is the normal traffic from your browser to the AI provider (Claude, ChatGPT, Gemini) — with the prompt content sanitized before it leaves your device.

---

## Third-Party Services

None. Privacy Mesh has no backend, no API, no cloud service, and no third-party SDK.

---

## Open Source

Privacy Mesh is fully open source under the MIT license. You can audit every line of code at:  
https://github.com/vashishtavarma/mirage-extension

---

## Changes to This Policy

If this policy changes, the updated version will be posted at the same URL with an updated effective date.

---

## Contact

Questions? Open an issue at https://github.com/vashishtavarma/mirage-extension/issues
