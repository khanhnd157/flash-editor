import type { Editor } from '@flash/core';
import { icons } from './icons';
import type { IconName } from './icons';
import { el, injectCSS, positionNear, getCaretRect } from './utils';

// ---- Types ----

export interface FloatingMenuItemConfig {
  key: string;
  icon?: IconName | string;
  label: string;
  command?: string;
  commandArgs?: unknown[];
  onClick?: (editor: Editor) => void;
}

export interface FloatingMenuConfig {
  editor: Editor;
  container: HTMLElement;
  items?: FloatingMenuItemConfig[];
  /** Show condition. Default: show when cursor is in an empty paragraph. */
  shouldShow?: (editor: Editor) => boolean;
}

// ---- Default items ----

export const defaultFloatingMenuItems: FloatingMenuItemConfig[] = [
  { key: 'heading-1', icon: 'heading1', label: 'Heading 1', command: 'setHeading', commandArgs: [{ level: 1 }] },
  { key: 'heading-2', icon: 'heading2', label: 'Heading 2', command: 'setHeading', commandArgs: [{ level: 2 }] },
  { key: 'heading-3', icon: 'heading3', label: 'Heading 3', command: 'setHeading', commandArgs: [{ level: 3 }] },
  { key: 'bullet-list', icon: 'bulletList', label: 'Bullet List', command: 'wrapInBulletList' },
  { key: 'blockquote', icon: 'blockquote', label: 'Quote', command: 'wrapInBlockquote' },
  { key: 'code-block', icon: 'codeBlock', label: 'Code Block', command: 'setCodeBlock' },
  { key: 'hr', icon: 'horizontalRule', label: 'Divider', command: 'insertHorizontalRule' },
];

// ---- CSS ----

const FLOATING_CSS = `
.flash-floating-menu{position:absolute;display:none;background:var(--flash-bg,#fff);border:1px solid var(--flash-border,#e2e8f0);border-radius:8px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:100;gap:4px;align-items:center}
.flash-floating-menu.flash-visible{display:flex}
.flash-floating-menu button{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:none;border-radius:5px;background:transparent;cursor:pointer;font-size:13px;color:var(--flash-text-muted,#6c757d);transition:all .15s;white-space:nowrap}
.flash-floating-menu button:hover{background:var(--flash-hover-bg,#f8f9fa);color:var(--flash-text,#1a1a2e)}
.flash-floating-menu button svg{width:16px;height:16px}
`;

// ---- FloatingMenu class ----

export class FloatingMenu {
  readonly dom: HTMLElement;
  private _editor: Editor;
  private _container: HTMLElement;
  private _items: FloatingMenuItemConfig[];
  private _shouldShow: (editor: Editor) => boolean;

  constructor(config: FloatingMenuConfig) {
    this._editor = config.editor;
    this._container = config.container;
    this._items = config.items ?? defaultFloatingMenuItems;
    this._shouldShow = config.shouldShow ?? defaultShouldShow;

    injectCSS(FLOATING_CSS, 'flash-floating-css');

    this.dom = el('div', { className: 'flash-floating-menu', attrs: { role: 'toolbar', 'aria-label': 'Block types' } });
    this._build();
    this._container.appendChild(this.dom);
  }

  update(): void {
    if (this._shouldShow(this._editor)) {
      this._show();
    } else {
      this._hide();
    }
  }

  destroy(): void {
    this.dom.remove();
  }

  private _show(): void {
    this.dom.classList.add('flash-visible');
    const caretRect = getCaretRect();
    if (caretRect) {
      const containerRect = this._container.getBoundingClientRect();
      positionNear(this.dom, caretRect, containerRect, 'below');
    }
  }

  private _hide(): void {
    this.dom.classList.remove('flash-visible');
  }

  private _build(): void {
    for (const item of this._items) {
      const iconHtml = item.icon
        ? (item.icon in icons ? icons[item.icon as IconName] : item.icon)
        : '';

      const btn = el('button', {
        attrs: { type: 'button', title: item.label, 'aria-label': item.label },
        onClick: () => {
          if (item.onClick) {
            item.onClick(this._editor);
          } else if (item.command) {
            this._editor.command(item.command, ...(item.commandArgs ?? []));
          }
        },
      });

      if (iconHtml) {
        const iconSpan = el('span', { html: iconHtml });
        iconSpan.querySelector('svg')?.setAttribute('width', '16');
        iconSpan.querySelector('svg')?.setAttribute('height', '16');
        btn.appendChild(iconSpan);
      }
      btn.appendChild(document.createTextNode(` ${item.label}`));

      this.dom.appendChild(btn);
    }
  }
}

function defaultShouldShow(editor: Editor): boolean {
  const { empty, $from } = editor.state.selection;
  if (!empty) return false;
  const node = $from.parent;
  return node.type.name === 'paragraph' && node.content.size === 0;
}
