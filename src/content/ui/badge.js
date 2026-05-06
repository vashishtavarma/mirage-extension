// ------------------------------------------------------------------
// Color tokens (white/gray palette)
// ------------------------------------------------------------------
// #FFFFFF white   #BFBFBF light-gray  #7F7F7F mid-gray
// #404040 dark-gray  #000000 black
// Accent: #16a34a green  #d97706 amber  #dc2626 red
// ------------------------------------------------------------------

let badgeHost = null;
let badgeEl = null;
let hideTimer = null;

export function initBadge(textarea) {
  badgeHost = document.createElement('div');
  badgeHost.id = 'pm-badge-host';
  badgeHost.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;top:0;left:0;';

  const shadow = badgeHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .badge {
        display: none;
        padding: 4px 12px;
        border-radius: 20px;
        font: 600 11px/20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        white-space: nowrap;
        box-shadow: 0 1px 6px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06);
        letter-spacing: .01em;
        background: #FFFFFF;
        border: 1.5px solid;
        transition: border-color .15s, color .15s;
      }
      .scanning { border-color: #7F7F7F; color: #7F7F7F; }
      .clean    { border-color: #16a34a; color: #16a34a; }
      .amber    { border-color: #d97706; color: #d97706; }
      .red      { border-color: #dc2626; color: #dc2626; }
    </style>
    <div class="badge" id="b"></div>
  `;

  badgeEl = shadow.getElementById('b');
  document.body.appendChild(badgeHost);
  positionNear(textarea);

  window.addEventListener('resize', () => positionNear(textarea), { passive: true });
  window.addEventListener('scroll', () => positionNear(textarea), { passive: true });
  textarea.addEventListener('input', hide, { passive: true });
}

export function showScanning() {
  show('Scanning…', 'scanning', 0);
}

export function updateBadge(piiCount) {
  if (piiCount === 0) {
    show('✓ Clean', 'clean', 2000);
  } else {
    const label = piiCount === 1 ? '1 item redacted' : `${piiCount} items redacted`;
    show(`🔒 ${label}`, piiCount >= 4 ? 'red' : 'amber', 6000);
  }
}

function show(text, cls, autohideMs) {
  if (!badgeEl) return;
  clearTimeout(hideTimer);
  badgeEl.textContent = text;
  badgeEl.className = `badge ${cls}`;
  badgeEl.style.display = 'block';
  if (autohideMs > 0) hideTimer = setTimeout(hide, autohideMs);
}

function hide() {
  if (badgeEl) badgeEl.style.display = 'none';
}

function positionNear(textarea) {
  if (!badgeHost || !textarea) return;
  const r = textarea.getBoundingClientRect();
  badgeHost.style.transform = `translate(${r.right - 148}px,${r.top - 32}px)`;
}
