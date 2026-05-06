import { sendToBackground, MSG } from '../shared/messages.js';

let guardHost = null;

/**
 * Attach a paste-event monitor to the prompt textarea.
 * If pasted content contains PII, shows a warning before it enters the editor.
 */
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
    return; // SW unreachable — allow paste normally
  }

  if (!result || result.piiCount === 0) return;

  // PII found — intercept paste and show warning
  event.preventDefault();
  event.stopImmediatePropagation();

  showClipboardWarning(event.target, text, result);
}

function showClipboardWarning(textarea, originalText, scanResult) {
  closeWarning();

  guardHost = document.createElement('div');
  guardHost.id = 'pm-clipboard-host';
  const shadow = guardHost.attachShadow({ mode: 'open' });

  const types = [...new Set(scanResult.detections.map((d) => d.type))];

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .toast {
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: #1e293b; border: 1px solid #f59e0b;
        border-radius: 12px; padding: 16px 20px; min-width: 340px; max-width: 520px;
        box-shadow: 0 8px 32px rgba(0,0,0,.4); z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e2e8f0; animation: slide-up .2s ease;
      }
      @keyframes slide-up { from { opacity:0; transform: translateX(-50%) translateY(16px); } }
      .title { font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 6px; }
      .body  { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
      .chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 14px; }
      .chip  { background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3);
               color: #fcd34d; border-radius: 3px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; }
      button { border: none; border-radius: 6px; padding: 7px 14px; font-size: 12px;
               font-weight: 600; cursor: pointer; }
      .paste-clean    { background: #22c55e; color: #fff; }
      .paste-original { background: #334155; color: #e2e8f0; }
      .dismiss        { background: transparent; color: #475569; }
      button:hover { opacity: .85; }
    </style>
    <div class="toast">
      <div class="title">📋 PII detected in clipboard</div>
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
    closeWarning();
    insertText(textarea, originalText);
  });

  shadow.getElementById('paste-clean').addEventListener('click', () => {
    closeWarning();
    insertText(textarea, scanResult.sanitizedPrompt);
  });

  // Auto-dismiss after 12s
  setTimeout(closeWarning, 12000);
}

function insertText(textarea, text) {
  textarea.focus();
  if (textarea.tagName === 'TEXTAREA') {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    textarea.value = current.slice(0, start) + text + current.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    document.execCommand('insertText', false, text);
  }
}

function closeWarning() {
  if (guardHost) { guardHost.remove(); guardHost = null; }
}
