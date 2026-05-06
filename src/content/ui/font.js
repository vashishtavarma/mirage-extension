// Injects the Montserrat font link into a Shadow DOM root.
// Called once per component before inserting styles.
export function injectFont(shadow) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap';
  shadow.insertBefore(link, shadow.firstChild);
}

export const FONT = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
