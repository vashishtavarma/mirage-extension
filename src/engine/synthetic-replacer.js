/**
 * Synthetic Replacement Mode — replaces PII with realistic-looking fake values
 * instead of [TOKEN] placeholders. Maintains a reverse map for de-anonymization.
 * All values are generated locally; nothing is fetched from the network.
 */

const FIRST_NAMES = [
  'Alex','Jordan','Taylor','Morgan','Casey','Riley','Avery','Quinn','Blake','Drew',
  'Parker','Reese','Logan','Skyler','Cameron','Peyton','Hayden','Emerson','Finley','Rowan',
];
const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Anderson',
  'Taylor','Thomas','Moore','Jackson','Martin','Lee','Thompson','White','Harris','Clark',
];
const EMAIL_DOMAINS = ['example.com', 'mailtest.net', 'sample.org', 'testmail.dev', 'placeholder.io'];
const AREA_CODES = ['555','800','888','877','866'];
const ORGS = ['Acme Corp','Sample Inc','Test Ltd','Placeholder LLC','Demo Systems'];
const CITIES = ['Springfield','Shelbyville','Riverdale','Lakewood','Fairview'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n, len) { return String(n).padStart(len, '0'); }

const GENERATORS = {
  EMAIL: () => {
    const name = pick(FIRST_NAMES).toLowerCase() + rand(10, 999);
    return `${name}@${pick(EMAIL_DOMAINS)}`;
  },
  PHONE: () => `(${pick(AREA_CODES)}) ${pad(rand(0,999),3)}-${pad(rand(0,9999),4)}`,
  SSN: () => `${pad(rand(100,899),3)}-${pad(rand(10,99),2)}-${pad(rand(1000,9999),4)}`,
  CREDIT_CARD: () => {
    // Luhn-valid test number (Visa test range)
    return `4111 1111 1111 1111`;
  },
  IP_ADDRESS: () => `192.0.2.${rand(1,254)}`,   // RFC 5737 documentation range
  IP_ADDRESS_V6: () => `2001:db8::${rand(1,9999).toString(16)}`,
  IBAN: () => `GB${pad(rand(10,99),2)}TEST${pad(rand(10000000,99999999),8)}`,
  PASSPORT: () => `X${pad(rand(1000000,9999999),7)}`,
  PERSON: () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
  ORGANIZATION: () => pick(ORGS),
  LOCATION: () => pick(CITIES),
  DATE_OF_BIRTH: () => `01/${pad(rand(1,28),2)}/${rand(1970,2000)}`,
  API_KEY: () => `sk-test${Math.random().toString(36).slice(2,22)}`,
};

/**
 * Replace detections with synthetic values instead of [TOKEN] placeholders.
 * Returns sanitized text + synthetic token map (synthetic → original).
 */
export function syntheticReplace(text, detections) {
  if (!detections.length) return { sanitized: text, tokenMap: {} };

  const tokenMap = {};
  const usedSynthetics = new Set();
  let result = '';
  let cursor = 0;

  for (const det of detections) {
    result += text.slice(cursor, det.start);

    const gen = GENERATORS[det.type] || (() => `[${det.type}]`);
    let synthetic;
    let attempts = 0;
    do {
      synthetic = gen();
      attempts++;
    } while (usedSynthetics.has(synthetic) && attempts < 10);

    usedSynthetics.add(synthetic);
    tokenMap[synthetic] = det.value;
    result += synthetic;
    cursor = det.end;
  }

  return { sanitized: result + text.slice(cursor), tokenMap };
}
