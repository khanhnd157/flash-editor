import type { Editor } from '@flash/core';
import { icons } from './icons';
import { el, injectCSS, positionNear, getSelectionRect, getCaretRect } from './utils';

// ---- Types ----

export interface LinkEditorConfig {
  editor: Editor;
  container: HTMLElement;
  /** Auto-show when cursor is inside a link. Default: true. */
  autoShow?: boolean;
}

// ---- CSS ----

const LINK_CSS = `
.flash-link-editor{position:absolute;display:none;background:var(--flash-bg,#fff);border:1px solid var(--flash-border,#e2e8f0);border-radius:10px;padding:8px;box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:150;align-items:center;gap:6px;min-width:320px}
.flash-link-editor.flash-visible{display:flex}
.flash-link-editor-input{flex:1;padding:6px 10px;border:1px solid var(--flash-border,#ddd);border-radius:6px;font-size:14px;outline:none;background:var(--flash-input-bg,#f8f9fa);color:var(--flash-text,#333);min-width:0}
.flash-link-editor-input:focus{border-color:var(--flash-accent,#4361ee);box-shadow:0 0 0 2px rgba(67,97,238,.15)}
.flash-link-editor button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:6px;background:transparent;cursor:pointer;color:var(--flash-text-muted,#6c757d);transition:all .15s;flex-shrink:0}
.flash-link-editor button:hover{background:var(--flash-hover-bg,#f0f0f5);color:var(--flash-text,#333)}
.flash-link-editor button.flash-primary{background:var(--flash-accent,#4361ee);color:#fff}
.flash-link-editor button.flash-primary:hover{opacity:.9}
.flash-link-editor button.flash-danger:hover{background:#fee2e2;color:#ef4444}
.flash-link-editor button svg{width:16px;height:16px}
.flash-link-display{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.flash-link-display a{color:var(--flash-accent,#4361ee);font-size:14px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
.flash-link-display a:hover{text-decoration:underline}
`;

// ---- LinkEditor class ----

export class LinkEditor {
  readonly dom: HTMLElement;
  private _editor: Editor;
  private _container: HTMLElement;
  private _autoShow: boolean;
  private _mode: 'display' | 'edit' = 'display';
  private _currentHref = '';
  private _input!: HTMLInputElement;

  constructor(config: LinkEditorConfig) {
    this._editor = config.editor;
    this._container = config.container;
    this._autoShow = config.autoShow ?? true;

    injectCSS(LINK_CSS, 'flash-link-css');

    this.dom = el('div', { className: 'flash-link-editor', attrs: { role: 'dialog', 'aria-label': 'Edit link' } });
    this._container.appendChild(this.dom);
  }

  /** Show the link editor for creating a new link. */
  show(href = ''): void {
    this._mode = 'edit';
    this._currentHref = href;
    this._render();
    this.dom.classList.add('flash-visible');
    this._position();
    requestAnimationFrame(() => this._input?.focus());
  }

  /** Update visibility based on cursor position. */
  update(): void {
    if (!this._autoShow) return;

    const state = this._editor.state;
    const linkType = state.schema.marks['link'];
    if (!linkType) return;

    // Check if cursor is inside a link
    if (state.selection.empty) {
      const marks = state.selection.$from.marks();
      const linkMark = marks.find((m: { type: unknown }) => m.type === linkType);
      if (linkMark) {
        this._mode = 'display';
        this._currentHref = (linkMark.attrs['href'] as string) || '';
        this._render();
        this.dom.classList.add('flash-visible');
        this._position();
        return;
      }
    }

    // Hide if not in edit mode (user might be typing a URL)
    if (this._mode !== 'edit') {
      this.dom.classList.remove('flash-visible');
    }
  }

  destroy(): void {
    this.dom.remove();
  }

  private _render(): void {
    this.dom.innerHTML = '';

    if (this._mode === 'display') {
      this._renderDisplay();
    } else {
      this._renderEdit();
    }
  }

  private _renderDisplay(): void {
    const display = el('div', { className: 'flash-link-display' });

    const anchor = el('a', {
      attrs: { href: this._currentHref, target: '_blank', rel: 'noopener noreferrer' },
      children: [this._currentHref],
    });
    display.appendChild(anchor);

    // Open externally
    display.appendChild(el('button', {
      attrs: { type: 'button', title: 'Open link', 'aria-label': 'Open link' },
      html: icons.externalLink,
      onClick: () => window.open(this._currentHref, '_blank', 'noopener'),
    }));

    this.dom.appendChild(display);

    // Edit button
    this.dom.appendChild(el('button', {
      attrs: { type: 'button', title: 'Edit link', 'aria-label': 'Edit link' },
      html: icons.link,
      onClick: () => {
        this._mode = 'edit';
        this._render();
        requestAnimationFrame(() => this._input?.focus());
      },
    }));

    // Remove link button
    this.dom.appendChild(el('button', {
      className: 'flash-danger',
      attrs: { type: 'button', title: 'Remove link', 'aria-label': 'Remove link' },
      html: icons.unlink,
      onClick: () => {
        this._editor.command('unsetLink');
        this.dom.classList.remove('flash-visible');
      },
    }));
  }

  private _renderEdit(): void {
    this._input = el('input', {
      className: 'flash-link-editor-input',
      attrs: { type: 'url', placeholder: 'Paste or type a link...', value: this._currentHref },
    }) as unknown as HTMLInputElement;
    (this._input as HTMLInputElement).value = this._currentHref;

    // Handle Enter to confirm
    this._input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._applyLink();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.dom.classList.remove('flash-visible');
      }
    });

    this.dom.appendChild(this._input);

    // Confirm button
    this.dom.appendChild(el('button', {
      className: 'flash-primary',
      attrs: { type: 'button', title: 'Apply', 'aria-label': 'Apply link' },
      html: icons.check,
      onClick: () => this._applyLink(),
    }));

    // Cancel button
    this.dom.appendChild(el('button', {
      attrs: { type: 'button', title: 'Cancel', 'aria-label': 'Cancel' },
      html: icons.x,
      onClick: () => {
        this.dom.classList.remove('flash-visible');
      },
    }));
  }

  private _applyLink(): void {
    const href = (this._input as HTMLInputElement).value.trim();
    if (href) {
      this._editor.command('toggleLink', { href });
    }
    this.dom.classList.remove('flash-visible');
  }

  private _position(): void {
    const rect = getSelectionRect() ?? getCaretRect();
    if (rect) {
      const containerRect = this._container.getBoundingClientRect();
      positionNear(this.dom, rect, containerRect, 'below');
    }
  }
}
