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
  waitForTextarea().then((textarea) => {
    console.log('[PrivacyMesh] Textarea found:', textarea.tagName, textarea.className.slice(0, 60));
    initBadge(textarea);
    attachKeyboardInterceptor(textarea);
    attachClickInterceptor();
  }).catch((err) => console.error(err.message));
}

// --- Re-entry guard — prevents our resume callbacks from being re-intercepted ---
let isProcessing = false;

// --- Submit interception ---

function attachKeyboardInterceptor(textarea) {
  textarea.addEventListener(
    'keydown',
    async (event) => {
      if (isProcessing) return;
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;

      const prompt = platform.getPromptText(textarea);
      if (!prompt.trim()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      isProcessing = true;
      await interceptAndSubmit(prompt, textarea, () => {
        // Dispatch a full keyboard Enter directly on the editor div.
        // isProcessing stays true during dispatch so our own listener skips it;
        // ProseMirror / the platform's own keydown handler sees it and submits.
        dispatchEnter(textarea);
        isProcessing = false;
      });
    },
    true // capture phase — fires before the platform's own handlers
  );
}

function attachClickInterceptor() {
  document.addEventListener(
    'click',
    async (event) => {
      if (isProcessing) return;
      if (!platform.isSubmitEvent(event)) return;

      const textarea = platform.getTextarea();
      if (!textarea) return;

      const prompt = platform.getPromptText(textarea);
      if (!prompt.trim()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      isProcessing = true;
      await interceptAndSubmit(prompt, textarea, () => {
        const btn = platform.getSubmitButton();
        if (btn) {
          // Dispatch a real-looking MouseEvent — React's delegated listener picks it up.
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
        isProcessing = false;
      });
    },
    true // capture phase
  );
}

// Dispatch a full Enter keydown that the host editor (ProseMirror, etc.) will
// process as a real submit. Must be called while isProcessing = true so our
// own capture listener ignores it.
function dispatchEnter(target) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    })
  );
}

async function interceptAndSubmit(prompt, textarea, resume) {
  console.log(`[PrivacyMesh] Intercepted: "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"`);

  let result;
  try {
    result = await sendToBackground(MSG.SANITIZE_PROMPT, { prompt });
  } catch (err) {
    console.error('[PrivacyMesh] Service worker unreachable, sending original:', err.message);
    resume(); // resume keeps isProcessing=true through btn.click(), then resets
    return;
  }

  const { sanitizedPrompt, piiCount, detections } = result;
  updateBadge(piiCount, detections);

  if (sanitizedPrompt !== prompt) {
    platform.setPromptText(textarea, sanitizedPrompt);
  }

  console.log(`[PrivacyMesh] Done. PII redacted: ${piiCount}. Resuming submit.`);
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
