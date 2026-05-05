// DOM adapter for claude.ai

export const platform = {
  name: 'claude',
  hostname: 'claude.ai',

  getTextarea() {
    // Claude uses a contenteditable div, not a <textarea>
    return (
      document.querySelector('div[contenteditable="true"].ProseMirror') ||
      document.querySelector('div[contenteditable="true"][data-placeholder]') ||
      document.querySelector('div[contenteditable="true"]')
    );
  },

  getPromptText(textarea) {
    return textarea.innerText || textarea.textContent || '';
  },

  setPromptText(textarea, text) {
    // Use execCommand to properly update React/ProseMirror internal state
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  },

  getSubmitButton() {
    return (
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('button[type="submit"]')
    );
  },

  // Returns true if the event target or its parents are the submit button
  isSubmitEvent(event) {
    const btn = this.getSubmitButton();
    return btn && (event.target === btn || btn.contains(event.target));
  },
};
