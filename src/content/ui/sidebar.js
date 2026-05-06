let sidebarHost = null;
let isOpen = false;

export function initSidebar() {
  sidebarHost = document.createElement('div');
  sidebarHost.id = 'pm-sidebar-host';
  sidebarHost.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483644;';

  const shadow = sidebarHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .panel {
        position: fixed; top: 0; right: -320px; width: 300px; height: 100vh;
        background: #0f172a; border-left: 1px solid #1e293b;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e2e8f0; overflow-y: auto;
        transition: right .25s cubic-bezier(.4,0,.2,1);
        display: flex; flex-direction: column;
      }
      .panel.open { right: 0; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px; border-bottom: 1px solid #1e293b;
        position: sticky; top: 0; background: #0f172a; z-index: 1;
      }
      .logo { font-size: 13px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
      .close { background: none; border: none; color: #475569; cursor: pointer; font-size: 16px; padding: 2px 4px; }
      .close:hover { color: #e2e8f0; }
      .section { padding: 14px 16px; border-bottom: 1px solid #1e293b; }
      .section-label {
        font-size: 10px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: #475569; margin-bottom: 10px;
      }
      .stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .stat-key { font-size: 12px; color: #94a3b8; }
      .stat-val { font-size: 12px; font-weight: 700; color: #f8fafc; }
      .token-row {
        display: flex; align-items: baseline; gap: 8px;
        margin-bottom: 6px; font-size: 12px;
      }
      .token { color: #86efac; font-family: monospace; font-size: 11px;
               background: rgba(34,197,94,.1); border-radius: 3px; padding: 1px 6px; }
      .token-val { color: #94a3b8; word-break: break-all; }
      .detection-row { margin-bottom: 6px; }
      .det-type {
        display: inline-block; font-size: 10px; font-weight: 700;
        letter-spacing: .04em; padding: 1px 6px; border-radius: 3px;
        background: rgba(99,102,241,.2); color: #a5b4fc; margin-right: 6px;
      }
      .det-val { font-size: 12px; color: #94a3b8; font-family: monospace; }
      .empty { font-size: 12px; color: #475569; font-style: italic; }
      .footer { padding: 14px 16px; margin-top: auto; }
      .footer-note { font-size: 11px; color: #334155; text-align: center; }
    </style>
    <div class="panel" id="panel">
      <div class="header">
        <div class="logo"><span class="dot" id="status-dot"></span> Privacy Mesh</div>
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
      <div class="footer">
        <div class="footer-note">All data is local. Tokens cleared on tab close.</div>
      </div>
    </div>
  `;

  shadow.getElementById('close').addEventListener('click', closeSidebar);
  document.body.appendChild(sidebarHost);

  // Keyboard shortcut: Alt+Shift+P
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'P') toggleSidebar();
  });
}

export function updateSidebar({ detections = [], tokenMap = {}, stats = {}, elapsedMs = 0 }) {
  if (!sidebarHost) return;
  const shadow = sidebarHost.shadowRoot;

  // Stats
  if (stats.promptsProcessed !== undefined) {
    shadow.getElementById('s-prompts').textContent = stats.promptsProcessed;
    shadow.getElementById('s-pii').textContent = stats.piiCaught;
  }
  shadow.getElementById('s-time').textContent = elapsedMs ? `${elapsedMs}ms` : '—';

  // Detections
  const detList = shadow.getElementById('detections-list');
  if (detections.length === 0) {
    detList.innerHTML = '<span class="empty">None found</span>';
  } else {
    detList.innerHTML = detections.map((d) => `
      <div class="detection-row">
        <span class="det-type">${d.type}</span>
        <span class="det-val">${escHtml(d.value.slice(0, 40))}${d.value.length > 40 ? '…' : ''}</span>
      </div>
    `).join('');
  }

  // Token map
  const tmList = shadow.getElementById('token-map-list');
  const entries = Object.entries(tokenMap);
  if (entries.length === 0) {
    tmList.innerHTML = '<span class="empty">No tokens yet</span>';
  } else {
    tmList.innerHTML = entries.map(([token, val]) => `
      <div class="token-row">
        <span class="token">${escHtml(token)}</span>
        <span class="token-val">${escHtml(val.slice(0, 32))}${val.length > 32 ? '…' : ''}</span>
      </div>
    `).join('');
  }
}

export function toggleSidebar() {
  isOpen ? closeSidebar() : openSidebar();
}

export function openSidebar() {
  if (!sidebarHost) return;
  sidebarHost.shadowRoot.getElementById('panel').classList.add('open');
  isOpen = true;
}

export function closeSidebar() {
  if (!sidebarHost) return;
  sidebarHost.shadowRoot.getElementById('panel').classList.remove('open');
  isOpen = false;
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
