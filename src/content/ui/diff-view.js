import { injectFont, FONT } from './font.js';

let diffHost = null;

export function showDiffView(original, sanitized, detections) {
  closeDiffView();

  diffHost = document.createElement('div');
  diffHost.id = 'pm-diff-host';
  const shadow = diffHost.attachShadow({ mode: 'open' });
  injectFont(shadow);

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.3);
      z-index: 2147483645;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      font-family: ${FONT};
    }
    .modal {
      background: #FFFFFF;
      border: 1.5px solid #BFBFBF;
      border-radius: 12px;
      width: 100%; max-width: 720px; max-height: 80vh;
      display: flex; flex-direction: column;
      box-shadow: 0 16px 48px rgba(0,0,0,.14);
    }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-bottom: 1px solid #BFBFBF;
    }
    .header-title { font-size: 13px; font-weight: 700; color: #000000; }
    .close {
      background: none; border: none; color: #7F7F7F;
      font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px;
    }
    .close:hover { background: #f5f5f5; color: #000000; }
    .cols {
      display: grid; grid-template-columns: 1fr 1fr;
      overflow: auto; flex: 1;
    }
    .col { padding: 16px 20px; }
    .col + .col { border-left: 1px solid #BFBFBF; background: #fafafa; }
    .col-label {
      font-size: 10px; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: #7F7F7F; margin-bottom: 10px;
    }
    .text {
      font-size: 13px; line-height: 1.7; color: #404040;
      white-space: pre-wrap; word-break: break-word;
    }
    .pii-orig {
      background: #fef3c7; color: #92400e;
      border-radius: 3px; padding: 0 3px;
      border-bottom: 1.5px solid #d97706;
    }
    .pii-token {
      background: #dcfce7; color: #166534;
      border-radius: 3px; padding: 0 3px;
      font-weight: 700; font-family: monospace; font-size: 11px;
      border-bottom: 1.5px solid #16a34a;
    }
    .footer {
      padding: 10px 20px; border-top: 1px solid #BFBFBF;
      font-size: 11px; color: #7F7F7F; text-align: right;
    }
  `);
  shadow.adoptedStyleSheets = [sheet];

  shadow.innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="header">
          <span class="header-title">Prompt diff &#x2014; what Privacy Mesh changed</span>
          <button class="close" id="close">&#x2715;</button>
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
        <div class="footer">Token map is stored locally and cleared when this tab closes.</div>
      </div>
    </div>
  `;

  shadow.getElementById('orig-text').innerHTML = highlightOriginal(original, detections);
  shadow.getElementById('san-text').innerHTML  = highlightSanitized(sanitized);
  shadow.getElementById('close').addEventListener('click', closeDiffView);
  shadow.getElementById('overlay').addEventListener('click', (e) => {
    if (e.target === shadow.getElementById('overlay')) closeDiffView();
  });

  document.body.appendChild(diffHost);
}

export function closeDiffView() {
  if (diffHost) { diffHost.remove(); diffHost = null; }
}

function highlightOriginal(text, detections) {
  if (!detections.length) return escHtml(text);
  let out = '', cursor = 0;
  for (const d of detections) {
    out += escHtml(text.slice(cursor, d.start));
    out += `<span class="pii-orig" title="${d.type}">${escHtml(d.value)}</span>`;
    cursor = d.end;
  }
  return out + escHtml(text.slice(cursor));
}

function highlightSanitized(text) {
  return escHtml(text).replace(/\[([A-Z_]+_\d+)\]/g, (_, t) => `<span class="pii-token">[${t}]</span>`);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
