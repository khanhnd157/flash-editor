/**
 * @flash/theme-notion — Notion-like minimal theme.
 * Clean, spacious, content-first design inspired by Notion.
 */

export const notionThemeCSS = /* css */ `
:root {
  --flash-bg: #ffffff;
  --flash-fg: #37352f;
  --flash-text: #37352f;
  --flash-text-muted: #9b9a97;
  --flash-border: #e9e9e7;
  --flash-hover: rgba(55,53,47,0.04);
  --flash-accent: #2eaadc;
  --flash-toolbar-bg: #ffffff;
  --flash-active-bg: rgba(55,53,47,0.08);
  --flash-active-fg: #37352f;
  --flash-bubble-bg: #37352f;
  --flash-bubble-fg: #ffffff;
  --flash-input-bg: #f7f6f3;
  --flash-icon-bg: rgba(55,53,47,0.06);
  --flash-hover-bg: rgba(55,53,47,0.04);
  --flash-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  --flash-font-mono: 'SFMono-Regular', Menlo, Consolas, 'PT Mono', 'Liberation Mono', Courier, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --flash-bg: #191919;
    --flash-fg: rgba(255,255,255,0.9);
    --flash-text: rgba(255,255,255,0.9);
    --flash-text-muted: rgba(255,255,255,0.4);
    --flash-border: rgba(255,255,255,0.06);
    --flash-hover: rgba(255,255,255,0.03);
    --flash-toolbar-bg: #202020;
    --flash-active-bg: rgba(255,255,255,0.08);
    --flash-active-fg: rgba(255,255,255,0.9);
    --flash-bubble-bg: #2f3437;
    --flash-bubble-fg: rgba(255,255,255,0.9);
    --flash-input-bg: rgba(255,255,255,0.06);
    --flash-icon-bg: rgba(255,255,255,0.06);
    --flash-hover-bg: rgba(255,255,255,0.03);
  }
}

.flash-editor {
  padding: 2rem 4rem;
  min-height: 100vh;
  outline: none;
  font-family: var(--flash-font);
  font-size: 16px;
  line-height: 1.5;
  color: var(--flash-text);
  background: var(--flash-bg);
  max-width: 900px;
  margin: 0 auto;
}

.flash-editor p {
  margin: 1px 0;
  padding: 3px 2px;
}

.flash-editor h1 {
  font-size: 1.875em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 4px;
  padding: 3px 2px;
  line-height: 1.2;
}

.flash-editor h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.4em;
  margin-bottom: 1px;
  padding: 3px 2px;
  line-height: 1.3;
}

.flash-editor h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 1px;
  padding: 3px 2px;
  line-height: 1.3;
}

.flash-editor h1:first-child { margin-top: 0; }

.flash-editor blockquote {
  border-left: 3px solid currentColor;
  padding-left: 14px;
  margin: 4px 0;
  font-size: inherit;
}

.flash-editor pre {
  background: var(--flash-icon-bg);
  padding: 2rem;
  border-radius: 3px;
  font-family: var(--flash-font-mono);
  font-size: 0.85em;
  line-height: 1.5;
  margin: 4px 0;
  tab-size: 2;
  overflow-x: auto;
}

.flash-editor pre code {
  background: none;
  color: inherit;
  padding: 0;
}

.flash-editor hr {
  border: none;
  border-top: 1px solid var(--flash-border);
  margin: 0.5em 0;
}

.flash-editor ul, .flash-editor ol {
  padding-left: 1.7em;
  margin: 1px 0;
}

.flash-editor li {
  padding: 3px 2px;
}

.flash-editor li p { margin: 0; }

.flash-editor strong { font-weight: 600; }
.flash-editor em { font-style: italic; }
.flash-editor s { text-decoration: line-through; }
.flash-editor u { text-decoration: underline; }

.flash-editor code {
  background: rgba(135,131,120,0.15);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: var(--flash-font-mono);
  font-size: 0.85em;
  color: #eb5757;
}

.flash-editor mark {
  background: rgba(251,243,219,1);
}

.flash-editor a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(55,53,47,0.4);
  text-underline-offset: 3px;
}

.flash-editor a:hover {
  text-decoration-color: currentColor;
}

.flash-editor img {
  max-width: 100%;
  border-radius: 1px;
}

.flash-editor ::selection {
  background: rgba(35,131,226,0.28);
}
`;

let _injected = false;

export function injectNotionTheme(): void {
  if (_injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'flash-theme-notion';
  style.textContent = notionThemeCSS;
  document.head.appendChild(style);
  _injected = true;
}
