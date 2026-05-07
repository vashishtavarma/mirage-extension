import { sendToBackground, MSG } from '../shared/messages.js';
import { injectFont, FONT } from './ui/font.js';

let guardHost = null;

export function initClipboardGuard(textarea) {
  textarea.addEventListener('paste', handlePaste, true);
}

async function handlePaste(event) {
  const text = event.clipboardData?.getData('text/plain') || '';
  if (!text || text.length < 6) return;

  let result;
  try {
    result = await sendToBackground(MSG.SANITIZE_PROMPT, { prompt: text });
  } catch {
    return;
  }

  if (!result || result.piiCount === 0) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  showClipboardWarning(event.target, text, result);
}

function showClipboardWarning(textarea, originalText, scanResult) {
  closeWarning();

  guardHost = document.createElement('div');
  guardHost.id = 'pm-clipboard-host';
  const shadow = guardHost.attachShadow({ mode: 'open' });
  injectFont(shadow);

  const types = [...new Set(scanResult.detections.map((d) => d.type))];

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .toast {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #FFFFFF;
      border: 1.5px solid #BFBFBF;
      border-top: 3px solid #d97706;
      border-radius: 10px; padding: 16px 20px;
      min-width: 340px; max-width: 520px;
      box-shadow: 0 8px 32px rgba(0,0,0,.12);
      z-index: 2147483646;
      font-family: ${FONT};
      color: #404040;
      animation: slide-up .2s ease;
    }
    @keyframes slide-up {
      from { opacity:0; transform: translateX(-50%) translateY(12px); }
    }
    .title { font-size: 13px; font-weight: 700; color: #000000; margin-bottom: 5px; }
    .body  { font-size: 12px; color: #7F7F7F; margin-bottom: 12px; }
    .chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 14px; }
    .chip  {
      background: #f5f5f5; border: 1px solid #BFBFBF; color: #404040;
      border-radius: 3px; padding: 1px 7px; font-size: 10px; font-weight: 700;
    }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    button {
      border-radius: 6px; padding: 7px 14px; font-size: 12px;
      font-weight: 600; cursor: pointer; border: 1.5px solid;
      transition: opacity .15s; font-family: ${FONT};
    }
    button:hover { opacity: .85; }
    .paste-clean    { background: #000000; border-color: #000000; color: #FFFFFF; }
    .paste-original { background: #FFFFFF; border-color: #BFBFBF; color: #404040; }
    .dismiss        { background: transparent; border-color: transparent; color: #7F7F7F; }
  `);
  shadow.adoptedStyleSheets = [sheet];

  shadow.innerHTML = `
    <div class="toast">
      <div class="title">&#x1F4CB; PII detected in clipboard</div>
      <div class="body">${scanResult.piiCount} item${scanResult.piiCount !== 1 ? 's' : ''} found in pasted content.</div>
      <div class="chips">${types.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
      <div class="actions">
        <button class="dismiss"        id="dismiss">Cancel</button>
        <button class="paste-original" id="paste-orig">Paste Original</button>
        <button class="paste-clean"    id="paste-clean">Paste Redacted</button>
      </div>
    </div>
  `;

  document.body.appendChild(guardHost);

  shadow.getElementById('dismiss').addEventListener('click', closeWarning);
  shadow.getElementById('paste-orig').addEventListener('click', () => {
    closeWarning(); insertText(textarea, originalText);
  });
  shadow.getElementById('paste-clean').addEventListener('click', () => {
    closeWarning(); insertText(textarea, scanResult.sanitizedPrompt);
  });

  setTimeout(closeWarning, 12000);
}

function insertText(textarea, text) {
  textarea.focus();
  if (textarea.tagName === 'TEXTAREA') {
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const cur = textarea.value;
    textarea.value = cur.slice(0, start) + text + cur.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    document.execCommand('insertText', false, text);
  }
}

function closeWarning() {
  if (guardHost) { guardHost.remove(); guardHost = null; }
}
