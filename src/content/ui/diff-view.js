let diffHost = null;

/**
 * Show a modal with the original prompt alongside the sanitized version,
 * with detected PII highlighted in each.
 */
export function showDiffView(original, sanitized, detections) {
  closeDiffView();

  diffHost = document.createElement('div');
  diffHost.id = 'pm-diff-host';
  const shadow = diffHost.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.6);
        z-index: 2147483645;
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .modal {
        background: #0f172a; border: 1px solid #334155;
        border-radius: 14px; width: 100%; max-width: 720px;
        max-height: 80vh; display: flex; flex-direction: column;
        box-shadow: 0 16px 48px rgba(0,0,0,.5);
      }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #1e293b;
      }
      .header-title { font-size: 13px; font-weight: 700; color: #f8fafc; }
      .close {
        background: none; border: none; color: #64748b;
        font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px;
      }
      .close:hover { color: #e2e8f0; }
      .cols {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0; overflow: auto; flex: 1;
      }
      .col { padding: 16px 20px; }
      .col + .col { border-left: 1px solid #1e293b; }
      .col-label {
        font-size: 10px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: #475569; margin-bottom: 10px;
      }
      .text {
        font-size: 13px; line-height: 1.7; color: #cbd5e1;
        white-space: pre-wrap; word-break: break-word;
      }
      .pii-orig { background: rgba(239,68,68,.25); color: #fca5a5; border-radius: 3px; padding: 0 2px; }
      .pii-token { background: rgba(34,197,94,.2); color: #86efac; border-radius: 3px; padding: 0 2px;
                   font-weight: 600; font-family: monospace; font-size: 11px; }
      .footer { padding: 12px 20px; border-top: 1px solid #1e293b; text-align: right; }
      .footer-note { font-size: 11px; color: #475569; }
    </style>
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="header">
          <span class="header-title">🔍 Prompt Diff — what Privacy Mesh changed</span>
          <button class="close" id="close">✕</button>
        </div>
        <div class="cols">
          <div class="col">
            <div class="col-label">Original (what you typed)</div>
            <div class="text" id="orig-text"></div>
          </div>
          <div class="col">
            <div class="col-label">Sanitized (what AI received)</div>
            <div class="text" id="san-text"></div>
          </div>
        </div>
        <div class="footer">
          <span class="footer-note">Token map is stored locally and cleared when you close this tab.</span>
        </div>
      </div>
    </div>
  `;

  shadow.getElementById('orig-text').innerHTML = highlightOriginal(original, detections);
  shadow.getElementById('san-text').innerHTML = highlightSanitized(sanitized, detections);

  shadow.getElementById('close').addEventListener('click', closeDiffView);
  shadow.getElementById('overlay').addEventListener('click', (e) => {
    if (e.target === shadow.getElementById('overlay')) closeDiffView();
  });

  document.body.appendChild(diffHost);
}

export function closeDiffView() {
  if (diffHost) { diffHost.remove(); diffHost = null; }
}

// Wrap detected PII spans in the original text
function highlightOriginal(text, detections) {
  if (!detections.length) return escHtml(text);
  let out = '';
  let cursor = 0;
  for (const d of detections) {
    out += escHtml(text.slice(cursor, d.start));
    out += `<span class="pii-orig" title="${d.type}">${escHtml(d.value)}</span>`;
    cursor = d.end;
  }
  return out + escHtml(text.slice(cursor));
}

// Wrap [TOKEN] placeholders in the sanitized text
function highlightSanitized(text, detections) {
  return escHtml(text).replace(/\[([A-Z_]+_\d+)\]/g, (_, token) => {
    return `<span class="pii-token">[${token}]</span>`;
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
