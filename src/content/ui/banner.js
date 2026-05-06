const HIGH_RISK = new Set(['SSN', 'PASSPORT', 'IBAN', 'CREDIT_CARD']);

export function hasHighRisk(detections) {
  return detections.some((d) => HIGH_RISK.has(d.type));
}

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
          background: rgba(0,0,0,.35);
          z-index: 2147483646;
          display: flex; align-items: flex-end;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .card {
          background: #FFFFFF;
          border: 1.5px solid #BFBFBF;
          border-top: 3px solid #d97706;
          border-radius: 12px;
          padding: 20px 24px;
          width: 100%; max-width: 540px;
          margin: 0 auto;
          box-shadow: 0 8px 32px rgba(0,0,0,.12);
        }
        .title {
          font-size: 13px; font-weight: 700;
          color: #000000; margin-bottom: 6px;
          display: flex; align-items: center; gap: 8px;
        }
        .body { font-size: 12px; color: #7F7F7F; margin-bottom: 14px; }
        .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
        .chip {
          background: #f5f5f5;
          border: 1px solid #BFBFBF;
          color: #404040;
          border-radius: 4px; padding: 2px 9px;
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
        }
        .actions { display: flex; gap: 10px; justify-content: flex-end; }
        button {
          border-radius: 7px; padding: 8px 18px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: opacity .15s; border: 1.5px solid;
        }
        button:hover { opacity: .85; }
        .confirm  { background: #000000; border-color: #000000; color: #FFFFFF; }
        .original { background: #FFFFFF; border-color: #BFBFBF; color: #404040; }
      </style>
      <div class="overlay">
        <div class="card">
          <div class="title">⚠️ High-risk data detected</div>
          <div class="body">Privacy Mesh found sensitive identifiers. Sending the redacted version is strongly recommended.</div>
          <div class="chips">${types.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
          <div class="actions">
            <button class="original" id="orig">Send Original</button>
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
