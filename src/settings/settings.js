// ── Constants ────────────────────────────────────────────────────────────────

const DETECTOR_META = {
  EMAIL:        { label: 'Email',         sub: 'RFC 5322 addresses' },
  PHONE:        { label: 'Phone',         sub: 'US & international' },
  SSN:          { label: 'SSN',           sub: 'NNN-NN-NNNN' },
  CREDIT_CARD:  { label: 'Credit Card',   sub: 'Visa, MC, Amex, Discover' },
  IP_ADDRESS:   { label: 'IP Address',    sub: 'IPv4 & IPv6' },
  DATE_OF_BIRTH:{ label: 'Date of Birth', sub: 'Contextual (DOB:, born)' },
  IBAN:         { label: 'IBAN',          sub: 'ISO 13616' },
  PASSPORT:     { label: 'Passport',      sub: 'US + common international' },
  API_KEY:      { label: 'API Key',       sub: 'sk-, ghp_, xox…' },
  PERSON:       { label: 'Person (NER)',  sub: 'Named entity recognition' },
  ORGANIZATION: { label: 'Org (NER)',     sub: 'Companies, agencies' },
  LOCATION:     { label: 'Location (NER)',sub: 'Cities, countries' },
};

const PROFILES = {
  work: {
    sensitivity: 'strict',
    detectors: Object.fromEntries(Object.keys(DETECTOR_META).map((k) => [k, true])),
  },
  personal: {
    sensitivity: 'balanced',
    detectors: Object.fromEntries(
      Object.keys(DETECTOR_META).map((k) => [k, ['EMAIL', 'PHONE', 'SSN'].includes(k)])
    ),
  },
  medical: {
    sensitivity: 'strict',
    detectors: Object.fromEntries(Object.keys(DETECTOR_META).map((k) => [k, true])),
  },
};

// ── State ─────────────────────────────────────────────────────────────────────

let settings = {};
let customRules = [];
let domainAllowlist = [];

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.sync.get(['settings', 'customRules', 'domainAllowlist']);
  settings        = stored.settings        || getDefaultSettings();
  customRules     = stored.customRules     || [];
  domainAllowlist = stored.domainAllowlist || [];

  renderGeneral();
  renderDetectors();
  renderCustomRules();
  renderAllowlist();
  await renderAuditLog();
  bindNavScroll();
  bindProfileButtons();
  bindSaveButton();
  bindAuditButtons();
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderGeneral() {
  document.getElementById('enabled').checked = settings.enabled !== false;
  document.getElementById('retention').value = settings.auditRetentionDays ?? 30;
  const radio = document.querySelector(`input[name="sensitivity"][value="${settings.sensitivity || 'balanced'}"]`);
  if (radio) radio.checked = true;
}

function renderDetectors() {
  const grid = document.getElementById('detector-grid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(DETECTOR_META)) {
    const checked = settings.detectors?.[key] !== false;
    const item = document.createElement('div');
    item.className = 'det-item';
    item.innerHTML = `
      <div>
        <div class="det-label">${meta.label}</div>
        <div class="det-sub">${meta.sub}</div>
      </div>
      <label class="toggle">
        <input type="checkbox" data-detector="${key}" ${checked ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    `;
    grid.appendChild(item);
  }
}

function renderCustomRules() {
  const list = document.getElementById('custom-rules-list');
  list.innerHTML = '';
  if (customRules.length === 0) {
    list.innerHTML = '<div class="empty-msg">No custom rules yet.</div>';
    return;
  }
  customRules.forEach((rule, i) => {
    const item = document.createElement('div');
    item.className = 'rule-item';
    item.innerHTML = `
      <div class="rule-info">
        <span class="rule-type">${escHtml(rule.type)}</span>
        <span class="rule-pattern">${escHtml(rule.pattern)}</span>
        <span class="rule-conf">${rule.confidence} confidence</span>
      </div>
      <button class="btn-icon" data-del-rule="${i}" title="Remove">✕</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('[data-del-rule]').forEach((btn) => {
    btn.addEventListener('click', () => {
      customRules.splice(Number(btn.dataset.delRule), 1);
      renderCustomRules();
    });
  });
}

function renderAllowlist() {
  const list = document.getElementById('allowlist-items');
  list.innerHTML = '';
  if (domainAllowlist.length === 0) {
    list.innerHTML = '<div class="empty-msg">No domains in allowlist.</div>';
    return;
  }
  domainAllowlist.forEach((domain, i) => {
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.innerHTML = `
      <span>${escHtml(domain)}</span>
      <button class="btn-icon" data-del-domain="${i}" title="Remove">✕</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('[data-del-domain]').forEach((btn) => {
    btn.addEventListener('click', () => {
      domainAllowlist.splice(Number(btn.dataset.delDomain), 1);
      renderAllowlist();
    });
  });
}

async function renderAuditLog() {
  const result = await chrome.storage.local.get('audit_log');
  const log = (result.audit_log || []).slice().reverse(); // newest first
  const tbody = document.getElementById('audit-body');
  const empty = document.getElementById('audit-empty');
  tbody.innerHTML = '';

  if (log.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  log.forEach((entry) => {
    const tr = document.createElement('tr');
    const time = new Date(entry.timestamp).toLocaleString();
    const types = (entry.piiTypes || []).map((t) => `<span class="type-chip">${t}</span>`).join('');
    tr.innerHTML = `
      <td>${time}</td>
      <td>${escHtml(entry.domain)}</td>
      <td>${types || '—'}</td>
      <td>${entry.piiCount}</td>
      <td>${entry.elapsedMs}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Bindings ──────────────────────────────────────────────────────────────────

function bindNavScroll() {
  const items = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      items.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          items.forEach((i) => i.classList.remove('active'));
          const link = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach((s) => observer.observe(s));
}

function bindProfileButtons() {
  document.querySelectorAll('[data-profile]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const profile = PROFILES[btn.dataset.profile];
      if (!profile) return;
      settings.sensitivity = profile.sensitivity;
      settings.detectors = { ...profile.detectors };
      renderGeneral();
      renderDetectors();
      showStatus(`${btn.dataset.profile} profile applied — save to keep`);
    });
  });
}

function bindSaveButton() {
  // Add custom rule
  document.getElementById('add-rule').addEventListener('click', () => {
    const type    = document.getElementById('rule-name').value.trim().toUpperCase();
    const pattern = document.getElementById('rule-pattern').value.trim();
    const confidence = document.getElementById('rule-confidence').value;
    const errEl   = document.getElementById('rule-error');
    errEl.textContent = '';

    if (!type || !pattern) { errEl.textContent = 'Both label and pattern are required.'; return; }
    try { new RegExp(pattern); } catch { errEl.textContent = 'Invalid regex pattern.'; return; }

    customRules.push({ type, pattern, confidence });
    document.getElementById('rule-name').value = '';
    document.getElementById('rule-pattern').value = '';
    renderCustomRules();
  });

  // Add domain
  document.getElementById('add-domain').addEventListener('click', () => {
    const val = document.getElementById('allowlist-domain').value.trim().toLowerCase();
    if (!val) return;
    if (!domainAllowlist.includes(val)) domainAllowlist.push(val);
    document.getElementById('allowlist-domain').value = '';
    renderAllowlist();
  });

  // Save
  document.getElementById('save').addEventListener('click', async () => {
    // Read current UI state into settings object
    settings.enabled   = document.getElementById('enabled').checked;
    settings.sensitivity = document.querySelector('input[name="sensitivity"]:checked')?.value || 'balanced';
    settings.auditRetentionDays = Number(document.getElementById('retention').value) || 30;

    settings.detectors = {};
    document.querySelectorAll('[data-detector]').forEach((el) => {
      settings.detectors[el.dataset.detector] = el.checked;
    });

    await chrome.storage.sync.set({ settings, customRules, domainAllowlist });
    showStatus('Saved!');
  });
}

function bindAuditButtons() {
  document.getElementById('export-log').addEventListener('click', async () => {
    const result = await chrome.storage.local.get('audit_log');
    const json = JSON.stringify(result.audit_log || [], null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `privacy-mesh-audit-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  });

  document.getElementById('clear-log').addEventListener('click', async () => {
    if (!confirm('Clear all audit log entries?')) return;
    await chrome.storage.local.remove('audit_log');
    await renderAuditLog();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultSettings() {
  return {
    enabled: true,
    sensitivity: 'balanced',
    auditRetentionDays: 30,
    detectors: Object.fromEntries(Object.keys(DETECTOR_META).map((k) => [k, true])),
  };
}

function showStatus(msg) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 2500);
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
