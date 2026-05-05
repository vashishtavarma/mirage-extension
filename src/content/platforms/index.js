import { platform as claude } from './claude.js';
import { platform as chatgpt } from './chatgpt.js';
import { platform as gemini } from './gemini.js';

const PLATFORMS = [claude, chatgpt, gemini];

export function detectPlatform() {
  const hostname = window.location.hostname;
  return PLATFORMS.find((p) => hostname.includes(p.hostname)) || null;
}
