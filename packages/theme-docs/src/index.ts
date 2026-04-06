/**
 * @flash/theme-docs — Google Docs-like theme.
 * Page-style layout with familiar document editing appearance.
 */

export const docsThemeCSS = /* css */ `
:root {
  --flash-bg: #ffffff;
  --flash-fg: #202124;
  --flash-text: #202124;
  --flash-text-muted: #5f6368;
  --flash-border: #dadce0;
  --flash-hover: #f1f3f4;
  --flash-accent: #1a73e8;
  --flash-toolbar-bg: #f9fbfd;
  --flash-active-bg: #d3e3fd;
  --flash-active-fg: #1967d2;
  --flash-bubble-bg: #202124;
  --flash-bubble-fg: #e8eaed;
  --flash-input-bg: #f1f3f4;
  --flash-icon-bg: #f1f3f4;
  --flash-hover-bg: #f1f3f4;
  --flash-font: 'Google Sans', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  --flash-font-mono: 'Roboto Mono', 'Courier New', monospace;
}

.flash-editor {
  padding: 72px 96px;
  min-height: 1056px; /* ~letter page height */
  outline: none;
  font-family: 'Arial', sans-serif;
  font-size: 11pt;
  line-height: 1.15;
  color: var(--flash-text);
  background: var(--flash-bg);
  max-width: 816px; /* ~letter page width */
  margin: 0 auto;
  box-shadow: 0 0 0 1px var(--flash-border);
}

.flash-editor p {
  margin: 0;
  padding: 0;
  min-height: 1.15em;
}

.flash-editor h1 {
  font-size: 20pt;
  font-weight: 400;
  margin: 20pt 0 6pt;
  line-height: 1.15;
  color: var(--flash-text);
  font-family: 'Arial', sans-serif;
}

.flash-editor h2 {
  font-size: 16pt;
  font-weight: 400;
  margin: 18pt 0 6pt;
  line-height: 1.15;
  color: var(--flash-text);
}

.flash-editor h3 {
  font-size: 13.99pt;
  font-weight: 400;
  margin: 16pt 0 4pt;
  line-height: 1.15;
  color: #434343;
}

.flash-editor h1:first-child,
.flash-editor h2:first-child,
.flash-editor h3:first-child {
  margin-top: 0;
}

.flash-editor blockquote {
  border-left: 4px solid #d0d0d0;
  padding: 0 0 0 12px;
  margin: 6pt 0 6pt 1.5em;
  color: #666;
}

.flash-editor pre {
  background: #f8f9fa;
  border: 1px solid var(--flash-border);
  padding: 12px 16px;
  border-radius: 0;
  font-family: var(--flash-font-mono);
  font-size: 10pt;
  line-height: 1.4;
  margin: 6pt 0;
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
  margin: 12pt 0;
}

.flash-editor ul, .flash-editor ol {
  padding-left: 36pt;
  margin: 6pt 0;
}

.flash-editor li {
  margin-bottom: 0;
}

.flash-editor li p { margin: 0; }

.flash-editor strong { font-weight: 700; }
.flash-editor em { font-style: italic; }
.flash-editor s { text-decoration: line-through; }
.flash-editor u { text-decoration: underline; }

.flash-editor code {
  background: #f1f3f4;
  padding: 1px 4px;
  font-family: var(--flash-font-mono);
  font-size: 10pt;
}

.flash-editor mark {
  background: #fcf79e;
}

.flash-editor a {
  color: #1155cc;
  text-decoration: underline;
}

.flash-editor img {
  max-width: 100%;
}

.flash-editor ::selection {
  background: #a8d1ff;
}
`;

let _injected = false;

export function injectDocsTheme(): void {
  if (_injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'flash-theme-docs';
  style.textContent = docsThemeCSS;
  document.head.appendChild(style);
  _injected = true;
}
