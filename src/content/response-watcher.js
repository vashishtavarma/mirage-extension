import { sendToBackground, MSG } from '../shared/messages.js';
import { updateSidebar } from './ui/sidebar.js';

let lastScanned = '';
let debounceTimer = null;
let observer = null;

/**
 * Watch for new AI response content and scan it for PII echo.
 * Uses a MutationObserver on the page body; debounces scans to avoid
 * scanning partial streamed responses.
 */
export function initResponseWatcher(platform) {
  observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    // Wait 1.5s after DOM settles — responses stream in chunks
    debounceTimer = setTimeout(() => scanLatestResponse(platform), 1500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

async function scanLatestResponse(platform) {
  const container = platform.getResponseContainer?.();
  if (!container) return;

  const text = container.innerText?.trim();
  if (!text || text === lastScanned || text.length < 20) return;
  lastScanned = text;

  let result;
  try {
    result = await sendToBackground(MSG.SCAN_RESPONSE, { responseText: text });
  } catch {
    return;
  }

  if (!result?.echoDetected || !result.warnings?.length) return;

  console.warn('[PrivacyMesh] Response scan warnings:', result.warnings);

  // Surface warnings in sidebar
  updateSidebar({
    detections: [],
    tokenMap: {},
    stats: {},
    elapsedMs: 0,
    responseWarnings: result.warnings,
  });

  showResponseWarningBadge(result.warnings.length);
}

let warnBadgeHost = null;

function showResponseWarningBadge(count) {
  if (warnBadgeHost) warnBadgeHost.remove();

  warnBadgeHost = document.createElement('div');
  const shadow = warnBadgeHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .badge {
        position: fixed; top: 16px; right: 16px; z-index: 2147483645;
        background: #ef4444; color: #fff;
        border-radius: 8px; padding: 8px 14px;
        font: 600 12px/1.4 -apple-system, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,.3);
        display: flex; align-items: center; gap: 8px;
        animation: fadein .2s ease;
      }
      @keyframes fadein { from { opacity:0; transform:translateY(-8px); } }
      button { background:none; border:none; color:#fff; cursor:pointer; font-size:14px; opacity:.7; }
      button:hover { opacity:1; }
    </style>
    <div class="badge">
      ⚠️ AI response may contain PII (${count} warning${count !== 1 ? 's' : ''})
      <button id="close">✕</button>
    </div>
  `;
  shadow.getElementById('close').addEventListener('click', () => {
    warnBadgeHost?.remove(); warnBadgeHost = null;
  });
  document.body.appendChild(warnBadgeHost);
  setTimeout(() => { warnBadgeHost?.remove(); warnBadgeHost = null; }, 8000);
}
