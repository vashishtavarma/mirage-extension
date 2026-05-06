import { detectPlatform } from './platforms/index.js';
import { sendToBackground, MSG } from '../shared/messages.js';
import { initBadge, showScanning, updateBadge } from './ui/badge.js';
import { showHighRiskBanner, hasHighRisk } from './ui/banner.js';
import { showDiffView } from './ui/diff-view.js';
import { initSidebar, updateSidebar, openSidebar, toggleSidebar } from './ui/sidebar.js';

const platform = detectPlatform();

if (!platform) {
  console.warn('[PrivacyMesh] No platform adapter for:', window.location.hostname);
} else {
  console.log('[PrivacyMesh] Active on', platform.name);
  init();
}

function init() {
  initSidebar();
  waitForTextarea()
    .then((textarea) => {
      console.log('[PrivacyMesh] Textarea found:', textarea.tagName, textarea.className.slice(0, 60));
      initBadge(textarea);
      attachKeyboardInterceptor(textarea);
      attachClickInterceptor();
    })
    .catch((err) => console.error(err.message));
}

// --- Re-entry guard ---
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
      const shouldSubmit = await interceptAndProcess(prompt, textarea);

      if (shouldSubmit) {
        dispatchEnter(textarea);
      }
      isProcessing = false;
    },
    true
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
      const shouldSubmit = await interceptAndProcess(prompt, textarea);

      if (shouldSubmit) {
        const btn = platform.getSubmitButton();
        if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
      isProcessing = false;
    },
    true
  );
}

/**
 * Core pipeline: sanitize → UI → decide.
 * Returns true if the (possibly modified) prompt should be submitted.
 */
async function interceptAndProcess(originalPrompt, textarea) {
  console.log(`[PrivacyMesh] Intercepted: "${originalPrompt.slice(0, 60)}${originalPrompt.length > 60 ? '…' : ''}"`);
  showScanning();

  let result;
  try {
    result = await sendToBackground(MSG.SANITIZE_PROMPT, { prompt: originalPrompt });
  } catch (err) {
    console.error('[PrivacyMesh] SW unreachable, sending original:', err.message);
    updateBadge(0, []);
    return true; // fail-open: send original
  }

  const { sanitizedPrompt, piiCount, detections, tokenMap, elapsedMs } = result;

  // Update badge
  updateBadge(piiCount, detections);

  // Update sidebar with latest result
  const stats = await sendToBackground(MSG.GET_SESSION_STATS).catch(() => ({}));
  updateSidebar({ detections, tokenMap, stats: stats.stats || {}, elapsedMs });

  // Show diff view if anything was redacted (click badge area to view — opened after banner)
  if (piiCount > 0) {
    // Auto-open sidebar so user sees what was found
    openSidebar();
  }

  // High-risk banner — pauses submit until user decides
  if (hasHighRisk(detections)) {
    const proceed = await showHighRiskBanner(detections);

    if (!proceed) {
      // User chose to send original — restore original text and submit as-is
      console.log('[PrivacyMesh] User override: sending original prompt');
      return true;
    }
  }

  // Apply sanitized text to the textarea
  if (sanitizedPrompt !== originalPrompt) {
    platform.setPromptText(textarea, sanitizedPrompt);

    // Expose diff view — user can open sidebar to see token map
    // Store for later (diff button in sidebar could trigger this)
    window.__pmLastDiff = { original: originalPrompt, sanitized: sanitizedPrompt, detections };
  }

  console.log(`[PrivacyMesh] Done. PII redacted: ${piiCount} (${elapsedMs}ms). Submitting.`);
  return true;
}

// --- Helpers ---

function dispatchEnter(target) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true, composed: true, view: window,
    })
  );
}

// Messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOGGLE_SIDEBAR') toggleSidebar();
  if (msg.type === 'SHOW_DIFF') {
    const d = window.__pmLastDiff;
    if (d) showDiffView(d.original, d.sanitized, d.detections);
  }
});

function waitForTextarea(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const found = platform.getTextarea();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const el = platform.getTextarea();
      if (el) { observer.disconnect(); resolve(el); }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('[PrivacyMesh] Textarea not found within timeout'));
    }, timeout);
  });
}
