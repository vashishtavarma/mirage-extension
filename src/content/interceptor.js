import { detectPlatform } from './platforms/index.js';
import { sendToBackground, MSG } from '../shared/messages.js';
import { initBadge, updateBadge } from './ui/badge.js';

const platform = detectPlatform();

if (!platform) {
  console.warn('[PrivacyMesh] No platform adapter for:', window.location.hostname);
} else {
  console.log('[PrivacyMesh] Active on', platform.name);
  init();
}

function init() {
  // Wait for the textarea to appear (SPAs load async)
  waitForTextarea().then((textarea) => {
    console.log('[PrivacyMesh] Textarea found, attaching interceptors');
    initBadge(textarea);
    attachKeyboardInterceptor(textarea);
    attachClickInterceptor();
  });
}

// --- Submit interception ---

function attachKeyboardInterceptor(textarea) {
  // Intercept Enter (without Shift) as submit
  textarea.addEventListener(
    'keydown',
    async (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        const prompt = platform.getPromptText(textarea);
        if (!prompt.trim()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        await interceptAndSubmit(prompt, textarea, () => {
          // Simulate Enter after sanitization is applied
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: false }));
        });
      }
    },
    true // capture phase — fires before the platform's own handlers
  );
}

function attachClickInterceptor() {
  document.addEventListener(
    'click',
    async (event) => {
      if (!platform.isSubmitEvent(event)) return;

      const textarea = platform.getTextarea();
      if (!textarea) return;

      const prompt = platform.getPromptText(textarea);
      if (!prompt.trim()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      await interceptAndSubmit(prompt, textarea, () => {
        // Re-click submit after text is replaced
        const btn = platform.getSubmitButton();
        if (btn) btn.click();
      });
    },
    true // capture phase
  );
}

async function interceptAndSubmit(prompt, textarea, resume) {
  console.log('[PrivacyMesh] Intercepted prompt, sending to service worker...');

  let result;
  try {
    result = await sendToBackground(MSG.SANITIZE_PROMPT, { prompt });
  } catch (err) {
    console.error('[PrivacyMesh] Service worker error, sending original prompt:', err);
    resume();
    return;
  }

  const { sanitizedPrompt, piiCount, detections } = result;

  updateBadge(piiCount, detections);

  if (sanitizedPrompt !== prompt) {
    platform.setPromptText(textarea, sanitizedPrompt);
  }

  console.log(`[PrivacyMesh] Sanitized. PII items redacted: ${piiCount}. Resuming submit.`);
  resume();
}

// --- Helpers ---

function waitForTextarea(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const found = platform.getTextarea();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const el = platform.getTextarea();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('[PrivacyMesh] Textarea not found within timeout'));
    }, timeout);
  });
}
