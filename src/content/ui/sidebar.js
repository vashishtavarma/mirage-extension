import { injectFont, FONT } from './font.js';

let sidebarHost = null;
let isOpen = false;

export function initSidebar() {
  sidebarHost = document.createElement('div');
  sidebarHost.id = 'pm-sidebar-host';
  sidebarHost.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483644;';

  const shadow = sidebarHost.attachShadow({ mode: 'open' });
  injectFont(shadow);

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .panel {
      position: fixed; top: 0; right: -320px; width: 300px; height: 100vh;
      background: #FFFFFF;
      border-left: 1.5px solid #BFBFBF;
      font-family: ${FONT};
      color: #404040; overflow-y: auto;
      transition: right .25s cubic-bezier(.4,0,.2,1);
      display: flex; flex-direction: column;
      box-shadow: -4px 0 24px rgba(0,0,0,.08);
    }
    .panel.open { right: 0; }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #BFBFBF;
      position: sticky; top: 0; background: #FFFFFF; z-index: 1;
    }
    .logo {
      font-size: 13px; font-weight: 700; color: #000000;
      display: flex; align-items: center; gap: 8px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }
    .close {
      background: none; border: none; color: #7F7F7F;
      cursor: pointer; font-size: 14px; padding: 3px 6px; border-radius: 4px;
    }
    .close:hover { background: #f5f5f5; color: #000000; }
    .section { padding: 12px 16px; border-bottom: 1px solid #BFBFBF; }
    .section-label {
      font-size: 10px; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: #7F7F7F; margin-bottom: 10px;
    }
    .stat-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 5px;
    }
    .stat-key { font-size: 12px; color: #7F7F7F; }
    .stat-val { font-size: 12px; font-weight: 700; color: #000000; }
    .detection-row { margin-bottom: 6px; display: flex; align-items: baseline; gap: 6px; }
    .det-type {
      display: inline-block; font-size: 10px; font-weight: 700;
      letter-spacing: .04em; padding: 1px 6px; border-radius: 3px;
      background: #f0f0f0; border: 1px solid #BFBFBF; color: #404040;
      flex-shrink: 0;
    }
    .det-type.semantic { background: #fef9c3; border-color: #d97706; color: #92400e; }
    .det-val { font-size: 11px; color: #7F7F7F; word-break: break-all; }
    .token-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
    .token {
      color: #166534; font-family: monospace; font-size: 11px;
      background: #dcfce7; border: 1px solid #bbf7d0;
      border-radius: 3px; padding: 1px 6px; flex-shrink: 0;
    }
    .token-val { font-size: 11px; color: #7F7F7F; word-break: break-all; }
    .warn-row {
      font-size: 11px; color: #92400e; background: #fef3c7;
      border: 1px solid #fde68a; border-radius: 4px;
      padding: 5px 8px; margin-bottom: 5px;
    }
    .empty { font-size: 12px; color: #BFBFBF; font-style: italic; }
    .footer { padding: 12px 16px; margin-top: auto; border-top: 1px solid #BFBFBF; }
    .footer-note { font-size: 10px; color: #BFBFBF; text-align: center; }
  `);
  shadow.adoptedStyleSheets = [sheet];

  shadow.innerHTML = `
    <div class="panel" id="panel">
      <div class="header">
        <div class="logo"><span class="dot"></span>Privacy Mesh</div>
        <button class="close" id="close">✕</button>
      </div>
      <div class="section">
        <div class="section-label">Session Stats</div>
        <div class="stat-row"><span class="stat-key">Prompts processed</span><span class="stat-val" id="s-prompts">0</span></div>
        <div class="stat-row"><span class="stat-key">PII items caught</span><span class="stat-val" id="s-pii">0</span></div>
        <div class="stat-row"><span class="stat-key">Last scan</span><span class="stat-val" id="s-time">—</span></div>
      </div>
      <div class="section">
        <div class="section-label">Last Detections</div>
        <div id="detections-list"><span class="empty">No detections yet</span></div>
      </div>
      <div class="section">
        <div class="section-label">Token Map (this tab)</div>
        <div id="token-map-list"><span class="empty">No tokens yet</span></div>
      </div>
      <div class="section" id="response-warn-section" style="display:none">
        <div class="section-label">&#x26A0;&#xFE0F; Response Warnings</div>
        <div id="response-warn-list"></div>
      </div>
      <div class="footer">
        <div class="footer-note">All data is local. Tokens cleared on tab close.</div>
      </div>
    </div>
  `;

  shadow.getElementById('close').addEventListener('click', closeSidebar);
  document.body.appendChild(sidebarHost);

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'P') toggleSidebar();
  });
}

export function updateSidebar({ detections = [], tokenMap = {}, stats = {}, elapsedMs = 0, semanticHits = [], responseWarnings = [] }) {
  if (!sidebarHost) return;
  const shadow = sidebarHost.shadowRoot;

  if (stats.promptsProcessed !== undefined) {
    shadow.getElementById('s-prompts').textContent = stats.promptsProcessed;
    shadow.getElementById('s-pii').textContent     = stats.piiCaught;
  }
  shadow.getElementById('s-time').textContent = elapsedMs ? `${elapsedMs}ms` : '—';

  const detList = shadow.getElementById('detections-list');
  if (!detections.length && !semanticHits.length) {
    detList.innerHTML = '<span class="empty">None found</span>';
  } else {
    detList.innerHTML =
      detections.map((d) => `
        <div class="detection-row">
          <span class="det-type">${d.type}</span>
          <span class="det-val">${escHtml(d.value.slice(0,40))}${d.value.length > 40 ? '…' : ''}</span>
        </div>`).join('') +
      semanticHits.map((h) => `
        <div class="detection-row">
          <span class="det-type semantic" title="${escHtml(h.reason)}">${h.type} &#x26A0;</span>
          <span class="det-val">${escHtml(h.match)}</span>
        </div>`).join('');
  }

  const tmList = shadow.getElementById('token-map-list');
  const entries = Object.entries(tokenMap);
  if (!entries.length) {
    tmList.innerHTML = '<span class="empty">No tokens yet</span>';
  } else {
    tmList.innerHTML = entries.map(([tok, val]) => `
      <div class="token-row">
        <span class="token">${escHtml(tok)}</span>
        <span class="token-val">${escHtml(val.slice(0,32))}${val.length > 32 ? '…' : ''}</span>
      </div>`).join('');
  }

  const warnSection = shadow.getElementById('response-warn-section');
  const warnList    = shadow.getElementById('response-warn-list');
  if (responseWarnings.length) {
    warnSection.style.display = 'block';
    warnList.innerHTML = responseWarnings.map((w) =>
      `<div class="warn-row">${escHtml(w.reason)}</div>`
    ).join('');
  } else {
    warnSection.style.display = 'none';
  }
}

export function toggleSidebar()  { isOpen ? closeSidebar() : openSidebar(); }
export function openSidebar()    { if (!sidebarHost) return; sidebarHost.shadowRoot.getElementById('panel').classList.add('open'); isOpen = true; }
export function closeSidebar()   { if (!sidebarHost) return; sidebarHost.shadowRoot.getElementById('panel').classList.remove('open'); isOpen = false; }

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
