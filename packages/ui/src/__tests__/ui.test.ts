import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { el, injectCSS, positionNear, getSelectionRect, getCaretRect } from '../utils';
import { icons } from '../icons';
import type { IconName } from '../icons';

// =============================================
// Utils tests
// =============================================

describe('el()', () => {
  it('creates an element with tag', () => {
    const node = el('div');
    expect(node.tagName).toBe('DIV');
  });

  it('applies className', () => {
    const node = el('span', { className: 'test-class' });
    expect(node.className).toBe('test-class');
  });

  it('applies attributes', () => {
    const node = el('button', { attrs: { type: 'button', 'aria-label': 'Click me' } });
    expect(node.getAttribute('type')).toBe('button');
    expect(node.getAttribute('aria-label')).toBe('Click me');
  });

  it('applies inline styles', () => {
    const node = el('div', { style: { display: 'flex', gap: '4px' } });
    expect(node.style.display).toBe('flex');
    expect(node.style.gap).toBe('4px');
  });

  it('appends text children', () => {
    const node = el('p', { children: ['Hello ', 'World'] });
    expect(node.textContent).toBe('Hello World');
  });

  it('appends element children', () => {
    const child = el('span', { children: ['inner'] });
    const parent = el('div', { children: [child] });
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].tagName).toBe('SPAN');
  });

  it('sets innerHTML', () => {
    const node = el('div', { html: '<b>bold</b>' });
    expect(node.innerHTML).toBe('<b>bold</b>');
  });

  it('registers click handler', () => {
    let clicked = false;
    const node = el('button', { onClick: () => { clicked = true; } });
    node.click();
    expect(clicked).toBe(true);
  });
});

describe('injectCSS()', () => {
  afterEach(() => {
    document.getElementById('test-css')?.remove();
  });

  it('injects a style tag', () => {
    const style = injectCSS('.test { color: red }', 'test-css');
    expect(style.tagName).toBe('STYLE');
    expect(style.textContent).toBe('.test { color: red }');
    expect(document.getElementById('test-css')).toBe(style);
  });

  it('is idempotent with same id', () => {
    const s1 = injectCSS('.a{}', 'test-css');
    const s2 = injectCSS('.b{}', 'test-css');
    expect(s1).toBe(s2);
    expect(document.querySelectorAll('#test-css').length).toBe(1);
  });
});

// =============================================
// Icons tests
// =============================================

describe('icons', () => {
  it('exports all expected icon keys', () => {
    const expected: IconName[] = [
      'bold', 'italic', 'underline', 'strike', 'code', 'highlight',
      'link', 'unlink', 'image', 'bulletList', 'orderedList', 'blockquote',
      'heading', 'horizontalRule', 'undo', 'redo', 'paragraph',
      'codeBlock', 'check', 'x', 'externalLink', 'plus', 'chevronDown',
    ];
    for (const key of expected) {
      expect(icons[key]).toBeDefined();
      expect(typeof icons[key]).toBe('string');
    }
  });

  it('each icon is a valid SVG string', () => {
    for (const [name, svg] of Object.entries(icons)) {
      expect(svg).toMatch(/^<svg /);
      expect(svg).toMatch(/<\/svg>$/);
      expect(svg).toContain('viewBox');
    }
  });

  it('icons render as DOM elements', () => {
    const div = document.createElement('div');
    div.innerHTML = icons.bold;
    const svg = div.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});

// =============================================
// positionNear tests
// =============================================

describe('positionNear()', () => {
  it('positions element above target', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'offsetWidth', { value: 100 });
    Object.defineProperty(element, 'offsetHeight', { value: 40 });
    document.body.appendChild(element);

    const targetRect = new DOMRect(200, 100, 80, 20);
    const containerRect = new DOMRect(0, 0, 800, 600);

    positionNear(element, targetRect, containerRect, 'above');

    expect(element.style.top).toBe('52px'); // 100 - 0 - 40 - 8
    document.body.removeChild(element);
  });

  it('positions element below target', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'offsetWidth', { value: 100 });
    Object.defineProperty(element, 'offsetHeight', { value: 40 });
    document.body.appendChild(element);

    const targetRect = new DOMRect(200, 100, 80, 20);
    const containerRect = new DOMRect(0, 0, 800, 600);

    positionNear(element, targetRect, containerRect, 'below');

    expect(element.style.top).toBe('124px'); // 100 - 0 + 20 + 4
    document.body.removeChild(element);
  });
});
