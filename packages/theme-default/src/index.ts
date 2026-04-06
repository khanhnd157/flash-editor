/**
 * @flash/theme-default — Clean, modern editor theme.
 *
 * Usage:
 *   import { defaultThemeCSS, injectDefaultTheme } from '@flash/theme-default';
 *   injectDefaultTheme(); // or use defaultThemeCSS for SSR
 */

export const defaultThemeCSS = /* css */ `
/* ---- Flash Editor Default Theme ---- */
:root {
  --flash-bg: hsl(0 0% 100%);
  --flash-fg: hsl(0 0% 3.9%);
  --flash-text: hsl(0 0% 3.9%);
  --flash-text-muted: hsl(0 0% 45.1%);
  --flash-border: hsl(0 0% 89.8%);
  --flash-hover: hsl(0 0% 95.1%);
  --flash-accent: hsl(221 83% 53%);
  --flash-accent-fg: hsl(0 0% 98%);
  --flash-ring: hsl(221 83% 53% / 0.3);
  --flash-toolbar-bg: hsl(0 0% 100%);
  --flash-active-bg: hsl(0 0% 91%);
  --flash-active-fg: hsl(0 0% 9%);
  --flash-bubble-bg: hsl(240 10% 3.9%);
  --flash-bubble-fg: hsl(0 0% 80%);
  --flash-input-bg: hsl(0 0% 97%);
  --flash-icon-bg: hsl(0 0% 96%);
  --flash-hover-bg: hsl(0 0% 96%);
  --flash-radius: 0.5rem;
  --flash-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --flash-font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --flash-bg: hsl(240 10% 3.9%);
    --flash-fg: hsl(0 0% 98%);
    --flash-text: hsl(0 0% 98%);
    --flash-text-muted: hsl(0 0% 63.9%);
    --flash-border: hsl(240 3.7% 15.9%);
    --flash-hover: hsl(240 3.7% 15.9%);
    --flash-toolbar-bg: hsl(240 10% 5%);
    --flash-active-bg: hsl(240 3.7% 20%);
    --flash-active-fg: hsl(0 0% 98%);
    --flash-bubble-bg: hsl(240 10% 10%);
    --flash-bubble-fg: hsl(0 0% 80%);
    --flash-input-bg: hsl(240 3.7% 12%);
    --flash-icon-bg: hsl(240 3.7% 15%);
    --flash-hover-bg: hsl(240 3.7% 15.9%);
  }
}

/* Editor container */
.flash-editor {
  padding: 1rem 1.5rem;
  min-height: 300px;
  outline: none;
  font-family: var(--flash-font);
  font-size: 1rem;
  line-height: 1.75;
  color: var(--flash-text);
  background: var(--flash-bg);
  caret-color: var(--flash-accent);
}

.flash-editor:focus {
  outline: none;
}

/* Block elements */
.flash-editor p {
  margin-bottom: 0.75em;
}

.flash-editor h1 {
  font-size: 2em;
  font-weight: 700;
  margin: 1.25em 0 0.5em;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.flash-editor h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 1em 0 0.4em;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.flash-editor h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0.75em 0 0.3em;
  line-height: 1.4;
}

.flash-editor h1:first-child,
.flash-editor h2:first-child,
.flash-editor h3:first-child {
  margin-top: 0;
}

.flash-editor blockquote {
  border-left: 3px solid var(--flash-accent);
  padding: 0.25em 0 0.25em 1.25em;
  margin: 0.75em 0;
  color: var(--flash-text-muted);
}

.flash-editor pre {
  background: hsl(240 10% 3.9%);
  color: hsl(0 0% 83.1%);
  padding: 1rem 1.25rem;
  border-radius: var(--flash-radius);
  overflow-x: auto;
  margin: 0.75em 0;
  font-family: var(--flash-font-mono);
  font-size: 0.875em;
  line-height: 1.6;
}

.flash-editor pre code {
  background: none;
  color: inherit;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

.flash-editor hr {
  border: none;
  border-top: 2px solid var(--flash-border);
  margin: 1.5em 0;
}

.flash-editor ul,
.flash-editor ol {
  padding-left: 1.75em;
  margin: 0.5em 0;
}

.flash-editor li {
  margin-bottom: 0.25em;
}

.flash-editor li p {
  margin-bottom: 0.15em;
}

.flash-editor img {
  max-width: 100%;
  height: auto;
  border-radius: var(--flash-radius);
}

/* Inline formatting */
.flash-editor strong {
  font-weight: 700;
}

.flash-editor em {
  font-style: italic;
}

.flash-editor s {
  text-decoration: line-through;
}

.flash-editor u {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.flash-editor code {
  background: var(--flash-icon-bg);
  padding: 0.15em 0.4em;
  border-radius: 0.25rem;
  font-family: var(--flash-font-mono);
  font-size: 0.875em;
  color: hsl(0 72% 51%);
}

.flash-editor mark {
  background: hsl(48 96% 89%);
  padding: 0.1em 0.2em;
  border-radius: 0.15rem;
}

.flash-editor a {
  color: var(--flash-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.flash-editor a:hover {
  text-decoration-thickness: 2px;
}

/* Selection */
.flash-editor ::selection {
  background: hsl(221 83% 53% / 0.2);
}

/* Placeholder (for empty editor) */
.flash-editor.is-empty::before {
  content: attr(data-placeholder);
  color: var(--flash-text-muted);
  pointer-events: none;
  position: absolute;
}
`;

let _injected = false;

/** Inject the default theme CSS into the document head. Idempotent. */
export function injectDefaultTheme(): void {
  if (_injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'flash-theme-default';
  style.textContent = defaultThemeCSS;
  document.head.appendChild(style);
  _injected = true;
}
