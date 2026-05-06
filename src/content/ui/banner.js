const HIGH_RISK = new Set(['SSN', 'PASSPORT', 'IBAN', 'CREDIT_CARD']);

export function hasHighRisk(detections) {
  return detections.some((d) => HIGH_RISK.has(d.type));
}

/**
 * Show a blocking banner for high-risk PII.
 * Resolves true  → proceed with redacted prompt
 * Resolves false → send original (user override)
 */
export function showHighRiskBanner(detections) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.id = 'pm-banner-host';
    const shadow = host.attachShadow({ mode: 'open' });

    const types = [...new Set(detections.filter((d) => HIGH_RISK.has(d.type)).map((d) => d.type))];

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.55);
          z-index: 2147483646;
          display: flex; align-items: flex-end;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .card {
          background: #1e293b;
          border: 1px solid rgba(239,68,68,.5);
          border-radius: 14px;
          padding: 20px 24px;
          width: 100%; max-width: 560px;
          margin: 0 auto;
          color: #e2e8f0;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
        }
        .title {
          font-size: 14px; font-weight: 700;
          color: #fbbf24; margin-bottom: 6px;
          display: flex; align-items: center; gap: 8px;
        }
        .body { font-size: 12px; color: #94a3b8; margin-bottom: 14px; }
        .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .chip {
          background: rgba(239,68,68,.15);
          border: 1px solid rgba(239,68,68,.35);
          color: #fca5a5;
          border-radius: 4px; padding: 2px 8px;
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
        }
        .actions { display: flex; gap: 10px; justify-content: flex-end; }
        button {
          border: none; border-radius: 7px;
          padding: 8px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: opacity .15s;
        }
        button:hover { opacity: .85; }
        .confirm  { background: #22c55e; color: #fff; }
        .original { background: #334155; color: #e2e8f0; }
      </style>
      <div class="overlay">
        <div class="card">
          <div class="title">⚠️ High-risk data detected</div>
          <div class="body">Privacy Mesh found sensitive identifiers and has redacted them. Choose how to proceed.</div>
          <div class="chips">${types.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
          <div class="actions">
            <button class="original" id="orig">Send Original (not recommended)</button>
            <button class="confirm"  id="conf">Send Redacted ✓</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(host);

    shadow.getElementById('conf').addEventListener('click', () => { host.remove(); resolve(true); });
    shadow.getElementById('orig').addEventListener('click', () => { host.remove(); resolve(false); });
  });
}
