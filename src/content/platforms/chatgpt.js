// DOM adapter for chat.openai.com

export const platform = {
  name: 'chatgpt',
  hostname: 'chat.openai.com',

  getTextarea() {
    return (
      document.querySelector('textarea#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"]#prompt-textarea') ||
      document.querySelector('textarea[placeholder]')
    );
  },

  getPromptText(textarea) {
    return textarea.value || textarea.innerText || textarea.textContent || '';
  },

  setPromptText(textarea, text) {
    if (textarea.tagName === 'TEXTAREA') {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      textarea.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }
  },

  getSubmitButton() {
    return (
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label="Send prompt"]')
    );
  },

  isSubmitEvent(event) {
    const btn = this.getSubmitButton();
    return btn && (event.target === btn || btn.contains(event.target));
  },

  getResponseContainer() {
    const blocks = document.querySelectorAll('[data-message-author-role="assistant"]');
    return blocks.length ? blocks[blocks.length - 1] : null;
  },
};
