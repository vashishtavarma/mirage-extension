// DOM adapter for claude.ai

export const platform = {
  name: 'claude',
  hostname: 'claude.ai',

  getTextarea() {
    // Claude uses a ProseMirror contenteditable div.
    // Try specific selectors first, fall back to any contenteditable in the input area.
    return (
      document.querySelector('div[contenteditable="true"].ProseMirror') ||
      document.querySelector('fieldset div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][data-placeholder]') ||
      document.querySelector('div[contenteditable="true"][spellcheck]') ||
      document.querySelector('div[contenteditable="true"]')
    );
  },

  getPromptText(textarea) {
    return textarea.innerText || textarea.textContent || '';
  },

  setPromptText(textarea, text) {
    textarea.focus();
    // execCommand is the only reliable way to update ProseMirror's internal state
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  },

  getSubmitButton() {
    // Try all known Claude send-button patterns
    return (
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[type="submit"]') ||
      // Last resort: a button containing an SVG arrow icon near the input
      [...document.querySelectorAll('button')].find((btn) => {
        const label = (btn.getAttribute('aria-label') || btn.title || '').toLowerCase();
        return label.includes('send');
      }) || null
    );
  },

  isSubmitEvent(event) {
    const btn = this.getSubmitButton();
    return !!btn && (event.target === btn || btn.contains(event.target));
  },
};
