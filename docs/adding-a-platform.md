# Adding a New AI Platform

Privacy Mesh uses platform adapters to handle DOM differences between AI chat UIs. Adding a new platform takes about 30 minutes.

## 1. Create the adapter file

Copy an existing adapter (e.g. `src/content/platforms/claude.js`) and create `src/content/platforms/yourplatform.js`.

Implement these methods:

```javascript
export const platform = {
  name: 'yourplatform',       // lowercase, used in logs
  hostname: 'yoursite.com',   // matched against window.location.hostname

  getTextarea() {
    // Return the DOM element where the user types prompts.
    // Try specific selectors first, fall back broadly.
    return document.querySelector('your-selector') || null;
  },

  getPromptText(textarea) {
    // Extract the current text from the textarea element.
    // Use .value for <textarea>, .innerText for contenteditable.
    return textarea.value || textarea.innerText || '';
  },

  setPromptText(textarea, text) {
    // Replace the textarea content with `text`.
    // For React/contenteditable, execCommand is most reliable.
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  },

  getSubmitButton() {
    // Return the send/submit button element, or null.
    return document.querySelector('button[aria-label="Send"]') || null;
  },

  isSubmitEvent(event) {
    const btn = this.getSubmitButton();
    return !!btn && (event.target === btn || btn.contains(event.target));
  },

  getResponseContainer() {
    // Return the most recent AI response element, for response scanning.
    // Return null if not easily identifiable.
    const blocks = document.querySelectorAll('.assistant-message');
    return blocks.length ? blocks[blocks.length - 1] : null;
  },
};
```

## 2. Register the adapter

In `src/content/platforms/index.js`, import and add your platform:

```javascript
import { platform as yourplatform } from './yourplatform.js';

const PLATFORMS = [claude, chatgpt, gemini, yourplatform]; // add here
```

## 3. Add host_permissions to manifests

In `manifest.json`:
```json
"host_permissions": [
  "https://claude.ai/*",
  "https://chat.openai.com/*",
  "https://gemini.google.com/*",
  "https://yoursite.com/*"
]
```

In `manifest.firefox.json`, add the same URL to `"permissions"`.

Also add a `content_scripts` match entry:
```json
"content_scripts": [{
  "matches": [
    "https://claude.ai/*",
    "https://chat.openai.com/*",
    "https://gemini.google.com/*",
    "https://yoursite.com/*"
  ],
  ...
}]
```

## 4. Test

1. `npm run build:dev`
2. Reload the extension in Chrome
3. Open your platform's URL
4. Check the browser console for `[PrivacyMesh] Active on yourplatform`
5. Type a prompt with an email and press Enter — confirm the badge appears

## 5. Add an E2E spec

Copy `tests/e2e/claude.spec.js` → `tests/e2e/yourplatform.spec.js` and update selectors.

## Tips

- Use Chrome DevTools → inspect the textarea to find the right selector
- If the page uses React, `document.execCommand('insertText')` is more reliable than setting `.value` directly
- If `getSubmitButton()` returns null, the keyboard Enter path still works (ProseMirror-style editors handle it internally)
- Check the `getResponseContainer()` selector by finding the last assistant message div after a real response
