import type { Editor } from '@flash/core';
import { isMarkActive } from '@flash/commands';
import { icons } from './icons';
import type { IconName } from './icons';
import { el, injectCSS, positionNear, getSelectionRect } from './utils';

// ---- Types ----

export interface BubbleMenuItemConfig {
  key: string;
  icon?: IconName | string;
  label: string;
  command?: string;
  commandArgs?: unknown[];
  onClick?: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

export interface BubbleMenuConfig {
  editor: Editor;
  container: HTMLElement;
  items?: BubbleMenuItemConfig[];
  shouldShow?: (editor: Editor) => boolean;
}

// ---- Default items ----

function markItem(key: string, icon: IconName, label: string, command: string, mark: string): BubbleMenuItemConfig {
  return {
    key, icon, label, command,
    isActive: (ed) => {
      const mt = ed.state.schema.marks[mark];
      return mt ? isMarkActive(ed.state, mt) : false;
    },
  };
}

export const defaultBubbleMenuItems: BubbleMenuItemConfig[] = [
  markItem('bold', 'bold', 'Bold', 'toggleBold', 'bold'),
  markItem('italic', 'italic', 'Italic', 'toggleItalic', 'italic'),
  markItem('underline', 'underline', 'Underline', 'toggleUnderline', 'underline'),
  markItem('strike', 'strike', 'Strike', 'toggleStrike', 'strike'),
  markItem('code', 'code', 'Code', 'toggleCode', 'code'),
  markItem('highlight', 'highlight', 'Highlight', 'toggleHighlight', 'highlight'),
  markItem('link', 'link', 'Link', 'toggleLink', 'link'),
];

// ---- CSS ----

const BUBBLE_CSS = `
.flash-bubble-menu {
  position: absolute;
  display: none;
  align-items: center;
  gap: 0;
  padding: 0.25rem;
  background: var(--flash-bubble-bg, hsl(240 10% 3.9%));
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  z-index: 100;
}
.flash-bubble-menu.flash-visible { display: flex; }
.flash-bubble-menu .flash-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  color: var(--flash-bubble-fg, hsl(0 0% 80%));
  transition: background-color 0.15s, color 0.15s;
  outline: none;
}
.flash-bubble-menu .flash-button:hover {
  background: rgba(255,255,255,0.1);
  color: hsl(0 0% 95%);
}
.flash-bubble-menu .flash-button[data-active="true"] {
  background: var(--flash-accent, hsl(221 83% 53%));
  color: #fff;
}
.flash-bubble-menu .flash-button svg {
  width: 1rem;
  height: 1rem;
}
.flash-bubble-menu .flash-separator {
  width: 1px;
  height: 1.25rem;
  background: rgba(255,255,255,0.15);
  margin: 0 0.125rem;
}
`;

// ---- BubbleMenu class ----

export class BubbleMenu {
  readonly dom: HTMLElement;
  private _editor: Editor;
  private _container: HTMLElement;
  private _items: BubbleMenuItemConfig[];
  private _buttons = new Map<string, HTMLButtonElement>();
  private _shouldShow: (editor: Editor) => boolean;

  constructor(config: BubbleMenuConfig) {
    this._editor = config.editor;
    this._container = config.container;
    this._items = config.items ?? defaultBubbleMenuItems;
    this._shouldShow = config.shouldShow ?? defaultShouldShow;

    injectCSS(BUBBLE_CSS, 'flash-bubble-css');

    this.dom = el('div', {
      className: 'flash-bubble-menu',
      attrs: { role: 'toolbar', 'aria-label': 'Formatting' },
    });
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
    for (const item of this._items) {
      const btn = this._buttons.get(item.key);
      if (btn && item.isActive) {
        const active = item.isActive(this._editor);
        btn.setAttribute('data-active', String(active));
        btn.setAttribute('aria-pressed', String(active));
      }
    }

    this.dom.classList.add('flash-visible');

    const selRect = getSelectionRect();
    if (selRect) {
      const containerRect = this._container.getBoundingClientRect();
      positionNear(this.dom, selRect, containerRect, 'above');
    }
  }

  private _hide(): void {
    this.dom.classList.remove('flash-visible');
  }

  private _build(): void {
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];

      // Separator before code and link groups
      if (item.key === 'code' || item.key === 'link') {
        this.dom.appendChild(el('div', {
          className: 'flash-separator',
          attrs: { role: 'none' },
        }));
      }

      const iconHtml = item.icon
        ? (item.icon in icons ? icons[item.icon as IconName] : item.icon)
        : undefined;

      const btn = el('button', {
        className: 'flash-button',
        attrs: {
          type: 'button',
          'aria-label': item.label,
          'data-active': 'false',
          'aria-pressed': 'false',
          role: 'button',
          tabindex: '-1',
        },
        html: iconHtml ?? item.label,
        onClick: () => {
          if (item.onClick) {
            item.onClick(this._editor);
          } else if (item.command) {
            this._editor.command(item.command, ...(item.commandArgs ?? []));
          }
          requestAnimationFrame(() => this.update());
        },
      });

      this._buttons.set(item.key, btn);
      this.dom.appendChild(btn);
    }
  }
}

function defaultShouldShow(editor: Editor): boolean {
  const { empty, $from } = editor.state.selection;
  return !empty && $from.parent.isTextblock;
}
