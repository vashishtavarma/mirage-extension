const DETECTOR_LABELS = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  SSN: 'SSN',
  CREDIT_CARD: 'Credit Card',
  IP_ADDRESS: 'IP Address',
  DATE_OF_BIRTH: 'Date of Birth',
  IBAN: 'IBAN',
  PASSPORT: 'Passport',
  PERSON: 'Person (NER)',
  ORGANIZATION: 'Organization (NER)',
  LOCATION: 'Location (NER)',
};

async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || getDefaultSettings();
}

function getDefaultSettings() {
  return {
    enabled: true,
    sensitivity: 'balanced',
    detectors: Object.fromEntries(Object.keys(DETECTOR_LABELS).map((k) => [k, true])),
  };
}

async function init() {
  const settings = await loadSettings();

  document.getElementById('enabled').checked = settings.enabled !== false;

  const sensitivityInput = document.querySelector(
    `input[name="sensitivity"][value="${settings.sensitivity || 'balanced'}"]`
  );
  if (sensitivityInput) sensitivityInput.checked = true;

  const grid = document.getElementById('detector-toggles');
  for (const [key, label] of Object.entries(DETECTOR_LABELS)) {
    const item = document.createElement('div');
    item.className = 'detector-item';
    item.innerHTML = `
      <span>${label}</span>
      <input type="checkbox" data-detector="${key}" ${settings.detectors?.[key] !== false ? 'checked' : ''} />
    `;
    grid.appendChild(item);
  }

  document.getElementById('save').addEventListener('click', async () => {
    const detectors = {};
    document.querySelectorAll('[data-detector]').forEach((el) => {
      detectors[el.dataset.detector] = el.checked;
    });

    const newSettings = {
      enabled: document.getElementById('enabled').checked,
      sensitivity: document.querySelector('input[name="sensitivity"]:checked')?.value || 'balanced',
      detectors,
    };

    await chrome.storage.sync.set({ settings: newSettings });

    const status = document.getElementById('save-status');
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', init);
