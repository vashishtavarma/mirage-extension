import { sendToBackground, MSG } from '../shared/messages.js';
import { updateSidebar } from './ui/sidebar.js';
import { injectFont, FONT } from './ui/font.js';

let lastScanned = '';
let debounceTimer = null;
let warnBadgeHost = null;

export function initResponseWatcher(platform) {
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => scanLatestResponse(platform), 1500);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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
  } catch { return; }

  if (!result?.echoDetected || !result.warnings?.length) return;

  console.warn('[PrivacyMesh] Response scan warnings:', result.warnings);
  updateSidebar({ detections: [], tokenMap: {}, stats: {}, elapsedMs: 0, responseWarnings: result.warnings });
  showResponseWarningBadge(result.warnings.length);
}

function showResponseWarningBadge(count) {
  if (warnBadgeHost) warnBadgeHost.remove();

  warnBadgeHost = document.createElement('div');
  const shadow = warnBadgeHost.attachShadow({ mode: 'open' });
  injectFont(shadow);

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    .badge {
      position: fixed; top: 16px; right: 16px; z-index: 2147483645;
      background: #FFFFFF;
      border: 1.5px solid #BFBFBF;
      border-left: 3px solid #dc2626;
      border-radius: 8px; padding: 10px 14px;
      font: 600 12px/1.4 ${FONT};
      color: #404040;
      box-shadow: 0 4px 16px rgba(0,0,0,.1);
      display: flex; align-items: center; gap: 10px;
      animation: fadein .2s ease;
    }
    @keyframes fadein { from { opacity:0; transform:translateY(-6px); } }
    button {
      background: none; border: none; color: #7F7F7F;
      cursor: pointer; font-size: 14px; padding: 0 2px;
    }
    button:hover { color: #000000; }
  `);
  shadow.adoptedStyleSheets = [sheet];

  shadow.innerHTML = `
    <div class="badge">
      &#x26A0;&#xFE0F; AI response may contain PII (${count} warning${count !== 1 ? 's' : ''})
      <button id="close">&#x2715;</button>
    </div>
  `;

  shadow.getElementById('close').addEventListener('click', () => {
    warnBadgeHost?.remove(); warnBadgeHost = null;
  });
  document.body.appendChild(warnBadgeHost);
  setTimeout(() => { warnBadgeHost?.remove(); warnBadgeHost = null; }, 8000);
}
