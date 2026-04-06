/**
 * High contrast theme variant for accessibility.
 * Meets WCAG AAA contrast ratios (7:1 for text, 4.5:1 for UI).
 */

export const highContrastCSS = /* css */ `
@media (forced-colors: active) {
  .flash-editor {
    forced-color-adjust: none;
  }
}

.flash-high-contrast {
  --flash-bg: #000000;
  --flash-fg: #ffffff;
  --flash-text: #ffffff;
  --flash-text-muted: #cccccc;
  --flash-border: #ffffff;
  --flash-hover: #333333;
  --flash-accent: #ffff00;
  --flash-accent-fg: #000000;
  --flash-ring: #ffff00;
  --flash-toolbar-bg: #111111;
  --flash-active-bg: #ffff00;
  --flash-active-fg: #000000;
  --flash-bubble-bg: #111111;
  --flash-bubble-fg: #ffffff;
  --flash-input-bg: #222222;
  --flash-icon-bg: #222222;
  --flash-hover-bg: #333333;
}

.flash-high-contrast .flash-editor {
  background: #000000;
  color: #ffffff;
  caret-color: #ffff00;
}

.flash-high-contrast .flash-editor a {
  color: #ffff00;
  text-decoration: underline;
}

.flash-high-contrast .flash-editor code {
  background: #222222;
  color: #00ff00;
  border: 1px solid #444444;
}

.flash-high-contrast .flash-editor mark {
  background: #ffff00;
  color: #000000;
}

.flash-high-contrast .flash-editor blockquote {
  border-left-color: #ffff00;
  color: #cccccc;
}

.flash-high-contrast .flash-editor pre {
  background: #111111;
  color: #00ff00;
  border: 1px solid #444444;
}

.flash-high-contrast .flash-editor hr {
  border-top-color: #ffffff;
}

.flash-high-contrast .flash-editor ::selection {
  background: #ffff00;
  color: #000000;
}

/* Focus indicators — extra visible */
.flash-high-contrast .flash-editor:focus {
  outline: 3px solid #ffff00;
  outline-offset: 2px;
}

.flash-high-contrast .flash-toolbar .flash-button:focus-visible {
  box-shadow: 0 0 0 3px #ffff00;
}
`;

let _injected = false;

export function injectHighContrastTheme(): void {
  if (_injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'flash-theme-high-contrast';
  style.textContent = highContrastCSS;
  document.head.appendChild(style);
  _injected = true;
}
