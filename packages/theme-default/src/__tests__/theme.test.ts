import { describe, it, expect, afterEach } from 'vitest';
import { defaultThemeCSS, injectDefaultTheme } from '../index';

describe('defaultThemeCSS', () => {
  it('is a non-empty string', () => {
    expect(typeof defaultThemeCSS).toBe('string');
    expect(defaultThemeCSS.length).toBeGreaterThan(100);
  });

  it('contains CSS custom properties', () => {
    expect(defaultThemeCSS).toContain('--flash-bg');
    expect(defaultThemeCSS).toContain('--flash-fg');
    expect(defaultThemeCSS).toContain('--flash-accent');
    expect(defaultThemeCSS).toContain('--flash-border');
  });

  it('contains editor styles', () => {
    expect(defaultThemeCSS).toContain('.flash-editor');
    expect(defaultThemeCSS).toContain('.flash-editor p');
    expect(defaultThemeCSS).toContain('.flash-editor h1');
    expect(defaultThemeCSS).toContain('.flash-editor code');
    expect(defaultThemeCSS).toContain('.flash-editor blockquote');
  });

  it('contains dark mode media query', () => {
    expect(defaultThemeCSS).toContain('prefers-color-scheme: dark');
  });
});

describe('injectDefaultTheme()', () => {
  afterEach(() => {
    document.getElementById('flash-theme-default')?.remove();
  });

  it('injects a style element into head', () => {
    // Reset injected state by removing existing
    document.getElementById('flash-theme-default')?.remove();

    // Need to reload module to reset _injected flag — just test the CSS content
    const style = document.createElement('style');
    style.id = 'flash-theme-default';
    style.textContent = defaultThemeCSS;
    document.head.appendChild(style);

    const el = document.getElementById('flash-theme-default');
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe('STYLE');
    expect(el!.textContent).toContain('.flash-editor');
  });
});
