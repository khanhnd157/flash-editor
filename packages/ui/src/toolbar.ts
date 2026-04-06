import type { Editor } from '@flash/core';
import { isMarkActive } from '@flash/commands';
import { icons } from './icons';
import type { IconName } from './icons';
import { el, injectCSS } from './utils';

// ---- Types ----

export interface ToolbarButtonConfig {
  key: string;
  icon?: IconName | string;
  label: string;
  command?: string;
  commandArgs?: unknown[];
  onClick?: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  className?: string;
}

export interface ToolbarSelectConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  onChange: (editor: Editor, value: string) => void;
  getValue?: (editor: Editor) => string;
}

export type ToolbarItem = ToolbarButtonConfig | ToolbarSelectConfig | 'separator';

export interface ToolbarConfig {
  editor: Editor;
  container: HTMLElement;
  items?: ToolbarItem[];
  /** Toolbar position variant. Default: 'fixed'. */
  variant?: 'fixed' | 'floating';
}

// ---- Default items ----

function markBtn(key: string, icon: IconName, label: string, command: string, mark: string): ToolbarButtonConfig {
  return {
    key, icon, label, command,
    isActive: (ed) => {
      const mt = ed.state.schema.marks[mark];
      return mt ? isMarkActive(ed.state, mt) : false;
    },
  };
}

export const defaultToolbarItems: ToolbarItem[] = [
  { key: 'undo', icon: 'undo', label: 'Undo', command: 'undo' },
  { key: 'redo', icon: 'redo', label: 'Redo', command: 'redo' },
  'separator',
  {
    key: 'block-type',
    label: 'Block type',
    options: [
      { value: 'paragraph', label: 'Paragraph' },
      { value: 'heading-1', label: 'Heading 1' },
      { value: 'heading-2', label: 'Heading 2' },
      { value: 'heading-3', label: 'Heading 3' },
      { value: 'code-block', label: 'Code Block' },
    ],
    onChange: (editor, value) => {
      const map: Record<string, () => void> = {
        'paragraph': () => editor.command('setParagraph'),
        'heading-1': () => editor.command('setHeading', { level: 1 }),
        'heading-2': () => editor.command('setHeading', { level: 2 }),
        'heading-3': () => editor.command('setHeading', { level: 3 }),
        'code-block': () => editor.command('setCodeBlock'),
      };
      map[value]?.();
    },
    getValue: (editor) => {
      const node = editor.state.selection.$from.parent;
      if (node.type.name === 'heading') return `heading-${node.attrs['level'] as number}`;
      if (node.type.name === 'code_block') return 'code-block';
      return 'paragraph';
    },
  } satisfies ToolbarSelectConfig,
  { key: 'blockquote', icon: 'blockquote', label: 'Blockquote', command: 'wrapInBlockquote' },
  { key: 'code-block', icon: 'codeBlock', label: 'Code Block', command: 'setCodeBlock' },
  'separator',
  markBtn('bold', 'bold', 'Bold', 'toggleBold', 'bold'),
  markBtn('italic', 'italic', 'Italic', 'toggleItalic', 'italic'),
  markBtn('strike', 'strike', 'Strike', 'toggleStrike', 'strike'),
  markBtn('code', 'code', 'Code', 'toggleCode', 'code'),
  markBtn('underline', 'underline', 'Underline', 'toggleUnderline', 'underline'),
  markBtn('highlight', 'highlight', 'Highlight', 'toggleHighlight', 'highlight'),
  markBtn('link', 'link', 'Link', 'toggleLink', 'link'),
  'separator',
  { key: 'bullet-list', icon: 'bulletList', label: 'Bullet List', command: 'wrapInBulletList' },
  { key: 'ordered-list', icon: 'orderedList', label: 'Ordered List', command: 'wrapInOrderedList' },
  { key: 'hr', icon: 'horizontalRule', label: 'Horizontal Rule', command: 'insertHorizontalRule' },
  'separator',
  { key: 'image', icon: 'image', label: 'Add image', command: 'insertImage' },
];

// ---- CSS (TipTap-style ghost buttons) ----

const TOOLBAR_CSS = `
.flash-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  padding: 0.25rem;
  border-bottom: 1px solid var(--flash-border, hsl(0 0% 89.8%));
  background: var(--flash-toolbar-bg, hsl(0 0% 100%));
}
.flash-toolbar[data-variant="floating"] {
  border: 1px solid var(--flash-border, hsl(0 0% 89.8%));
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.flash-toolbar-group {
  display: flex;
  align-items: center;
  gap: 0;
}
.flash-separator {
  width: 1px;
  height: 1.5rem;
  margin: 0 0.25rem;
  background: var(--flash-border, hsl(0 0% 89.8%));
  flex-shrink: 0;
}
.flash-toolbar .flash-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  min-width: 2rem;
  padding: 0 0.375rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  color: var(--flash-fg, hsl(0 0% 3.9%));
  font-size: 0.875rem;
  line-height: 1;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
  position: relative;
  outline: none;
  -webkit-user-select: none;
  user-select: none;
}
.flash-toolbar .flash-button:hover {
  background: var(--flash-hover, hsl(0 0% 95.1%));
}
.flash-toolbar .flash-button:focus-visible {
  box-shadow: 0 0 0 2px var(--flash-ring, hsl(0 0% 63.9%));
}
.flash-toolbar .flash-button[data-active="true"] {
  background: var(--flash-active-bg, hsl(0 0% 91%));
  color: var(--flash-active-fg, hsl(0 0% 9%));
}
.flash-toolbar .flash-button[data-disabled="true"],
.flash-toolbar .flash-button:disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}
.flash-toolbar .flash-button svg,
.flash-toolbar .flash-button-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.flash-toolbar .flash-button .flash-button-text {
  margin-left: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
}
.flash-toolbar select {
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--flash-fg, hsl(0 0% 3.9%));
  cursor: pointer;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  padding-right: 1.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.375rem center;
  transition: background-color 0.15s;
}
.flash-toolbar select:hover {
  background-color: var(--flash-hover, hsl(0 0% 95.1%));
}
.flash-toolbar select:focus-visible {
  box-shadow: 0 0 0 2px var(--flash-ring, hsl(0 0% 63.9%));
}
`;

// ---- Toolbar class ----

export class Toolbar {
  readonly dom: HTMLElement;
  private _editor: Editor;
  private _buttons = new Map<string, HTMLButtonElement>();
  private _selects = new Map<string, HTMLSelectElement>();
  private _items: ToolbarItem[];

  constructor(config: ToolbarConfig) {
    this._editor = config.editor;
    this._items = config.items ?? defaultToolbarItems;

    injectCSS(TOOLBAR_CSS, 'flash-toolbar-css');

    this.dom = el('div', {
      className: 'flash-toolbar',
      attrs: {
        role: 'toolbar',
        'aria-label': 'toolbar',
        'data-variant': config.variant ?? 'fixed',
      },
    });

    this._build();
    config.container.prepend(this.dom);
  }

  update(): void {
    for (const item of this._items) {
      if (item === 'separator') continue;
      if (isSelectConfig(item)) {
        const select = this._selects.get(item.key);
        if (select && item.getValue) {
          select.value = item.getValue(this._editor);
        }
      } else {
        const btn = this._buttons.get(item.key);
        if (!btn) continue;
        const active = item.isActive?.(this._editor) ?? false;
        btn.setAttribute('data-active', String(active));
        btn.setAttribute('aria-pressed', String(active));
        if (item.isDisabled) {
          const disabled = item.isDisabled(this._editor);
          btn.disabled = disabled;
          btn.setAttribute('data-disabled', String(disabled));
        }
      }
    }
  }

  destroy(): void {
    this.dom.remove();
  }

  private _build(): void {
    let group = el('div', { className: 'flash-toolbar-group', attrs: { role: 'group' } });

    for (const item of this._items) {
      if (item === 'separator') {
        if (group.childElementCount > 0) {
          this.dom.appendChild(group);
          this.dom.appendChild(el('div', {
            className: 'flash-separator',
            attrs: { 'data-orientation': 'vertical', role: 'none' },
          }));
          group = el('div', { className: 'flash-toolbar-group', attrs: { role: 'group' } });
        }
        continue;
      }

      if (isSelectConfig(item)) {
        group.appendChild(this._buildSelect(item));
      } else {
        group.appendChild(this._buildButton(item));
      }
    }

    if (group.childElementCount > 0) {
      this.dom.appendChild(group);
    }
  }

  private _buildButton(cfg: ToolbarButtonConfig): HTMLButtonElement {
    const iconHtml = cfg.icon
      ? (cfg.icon in icons ? icons[cfg.icon as IconName] : cfg.icon)
      : undefined;

    const btn = el('button', {
      className: `flash-button${cfg.className ? ` ${cfg.className}` : ''}`,
      attrs: {
        type: 'button',
        'aria-label': cfg.label,
        'data-active': 'false',
        role: 'button',
        tabindex: '-1',
      },
      html: iconHtml ?? `<span class="flash-button-text">${cfg.label}</span>`,
      onClick: () => {
        if (cfg.onClick) {
          cfg.onClick(this._editor);
        } else if (cfg.command) {
          this._editor.command(cfg.command, ...(cfg.commandArgs ?? []));
        }
      },
    });

    this._buttons.set(cfg.key, btn);
    return btn;
  }

  private _buildSelect(cfg: ToolbarSelectConfig): HTMLSelectElement {
    const select = el('select', {
      attrs: { 'aria-label': cfg.label },
    });

    for (const opt of cfg.options) {
      const option = el('option', { attrs: { value: opt.value }, children: [opt.label] });
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      cfg.onChange(this._editor, select.value);
    });

    this._selects.set(cfg.key, select);
    return select;
  }
}

function isSelectConfig(item: ToolbarItem): item is ToolbarSelectConfig {
  return typeof item === 'object' && 'options' in item;
}
