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
        padding: 4px 10px;
        border-radius: 20px;
        font: 600 11px/20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #fff;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,.3);
        transition: background .15s;
        letter-spacing: .01em;
      }
      .scanning { background: #6366f1; }
      .clean    { background: #22c55e; }
      .amber    { background: #f59e0b; }
      .red      { background: #ef4444; }
    </style>
    <div class="badge" id="b"></div>
  `;

  badgeEl = shadow.getElementById('b');
  document.body.appendChild(badgeHost);
  positionNear(textarea);

  window.addEventListener('resize', () => positionNear(textarea), { passive: true });
  window.addEventListener('scroll', () => positionNear(textarea), { passive: true });

  // Hide badge on next keystroke (user is editing again)
  textarea.addEventListener('input', hide, { passive: true });
}

export function showScanning() {
  show('Scanning…', 'scanning', 0);
}

export function updateBadge(piiCount, detections = []) {
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
  badgeHost.style.transform = `translate(${r.right - 148}px, ${r.top - 30}px)`;
}
