// DOM adapter for gemini.google.com

export const platform = {
  name: 'gemini',
  hostname: 'gemini.google.com',

  getTextarea() {
    return (
      document.querySelector('div[contenteditable="true"].ql-editor') ||
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]')
    );
  },

  getPromptText(textarea) {
    return textarea.innerText || textarea.textContent || '';
  },

  setPromptText(textarea, text) {
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  },

  getSubmitButton() {
    return (
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('button.send-button') ||
      document.querySelector('button[mattooltip="Send message"]')
    );
  },

  isSubmitEvent(event) {
    const btn = this.getSubmitButton();
    return btn && (event.target === btn || btn.contains(event.target));
  },

  getResponseContainer() {
    const blocks = document.querySelectorAll('model-response, [class*="model-response"]');
    return blocks.length ? blocks[blocks.length - 1] : null;
  },
};
