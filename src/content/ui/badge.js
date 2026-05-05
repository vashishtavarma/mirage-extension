// Floating PII count badge attached to the prompt textarea.
// Phase 1: scaffold only — full styling/animation in Phase 3.

let badgeEl = null;

export function initBadge(textarea) {
  badgeEl = document.createElement('div');
  badgeEl.id = 'privacy-mesh-badge';
  badgeEl.setAttribute('aria-live', 'polite');
  badgeEl.style.cssText = `
    position: absolute;
    z-index: 999999;
    font-size: 11px;
    font-family: monospace;
    background: #22c55e;
    color: #fff;
    border-radius: 4px;
    padding: 2px 6px;
    pointer-events: none;
    display: none;
  `;
  document.body.appendChild(badgeEl);
  positionBadge(textarea);

  // Reposition on scroll/resize
  window.addEventListener('resize', () => positionBadge(textarea), { passive: true });
}

export function updateBadge(piiCount, detections = []) {
  if (!badgeEl) return;

  if (piiCount === 0) {
    badgeEl.style.display = 'none';
    return;
  }

  badgeEl.textContent = `${piiCount} item${piiCount !== 1 ? 's' : ''} redacted`;
  badgeEl.style.background = piiCount >= 4 ? '#ef4444' : '#f59e0b';
  badgeEl.style.display = 'block';

  // Auto-hide after 4s
  clearTimeout(badgeEl._hideTimer);
  badgeEl._hideTimer = setTimeout(() => {
    if (badgeEl) badgeEl.style.display = 'none';
  }, 4000);
}

function positionBadge(textarea) {
  if (!badgeEl || !textarea) return;
  const rect = textarea.getBoundingClientRect();
  badgeEl.style.top = `${rect.top + window.scrollY - 28}px`;
  badgeEl.style.left = `${rect.right + window.scrollX - 120}px`;
}
