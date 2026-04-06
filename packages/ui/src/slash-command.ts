import type { Editor } from '@flash/core';
import { icons } from './icons';
import type { IconName } from './icons';
import { el, injectCSS, getCaretRect } from './utils';

// ---- Types ----

export interface SlashCommandItemConfig {
  key: string;
  icon?: IconName | string;
  label: string;
  description?: string;
  /** Keywords for search (in addition to label). */
  keywords?: string[];
  command?: string;
  commandArgs?: unknown[];
  onClick?: (editor: Editor) => void;
}

export interface SlashCommandConfig {
  editor: Editor;
  container: HTMLElement;
  items?: SlashCommandItemConfig[];
  /** Trigger character. Default: '/' */
  trigger?: string;
}

// ---- Default items ----

export const defaultSlashCommandItems: SlashCommandItemConfig[] = [
  { key: 'paragraph', icon: 'paragraph', label: 'Paragraph', description: 'Plain text block', keywords: ['text', 'plain'], command: 'setParagraph' },
  { key: 'heading-1', icon: 'heading1', label: 'Heading 1', description: 'Large section heading', keywords: ['h1', 'title'], command: 'setHeading', commandArgs: [{ level: 1 }] },
  { key: 'heading-2', icon: 'heading2', label: 'Heading 2', description: 'Medium section heading', keywords: ['h2', 'subtitle'], command: 'setHeading', commandArgs: [{ level: 2 }] },
  { key: 'heading-3', icon: 'heading3', label: 'Heading 3', description: 'Small section heading', keywords: ['h3'], command: 'setHeading', commandArgs: [{ level: 3 }] },
  { key: 'bullet-list', icon: 'bulletList', label: 'Bullet List', description: 'Unordered list', keywords: ['ul', 'unordered'], command: 'wrapInBulletList' },
  { key: 'ordered-list', icon: 'orderedList', label: 'Ordered List', description: 'Numbered list', keywords: ['ol', 'numbered'], command: 'wrapInOrderedList' },
  { key: 'blockquote', icon: 'blockquote', label: 'Quote', description: 'Block quotation', keywords: ['quote', 'cite'], command: 'wrapInBlockquote' },
  { key: 'code-block', icon: 'codeBlock', label: 'Code Block', description: 'Code with syntax highlighting', keywords: ['pre', 'snippet'], command: 'setCodeBlock' },
  { key: 'hr', icon: 'horizontalRule', label: 'Divider', description: 'Horizontal rule', keywords: ['line', 'separator', 'hr'], command: 'insertHorizontalRule' },
  { key: 'image', icon: 'image', label: 'Image', description: 'Embed an image', keywords: ['img', 'photo', 'picture'], command: 'insertImage' },
];

// ---- CSS ----

const SLASH_CSS = `
.flash-slash-menu{position:absolute;display:none;flex-direction:column;width:280px;max-height:320px;overflow-y:auto;background:var(--flash-bg,#fff);border:1px solid var(--flash-border,#e2e8f0);border-radius:10px;padding:6px;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:200}
.flash-slash-menu.flash-visible{display:flex}
.flash-slash-menu-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;border-radius:6px;background:transparent;cursor:pointer;text-align:left;transition:background .1s;width:100%}
.flash-slash-menu-item:hover,.flash-slash-menu-item.flash-selected{background:var(--flash-hover-bg,#f0f0f5)}
.flash-slash-menu-item-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:6px;background:var(--flash-icon-bg,#f4f4f8);flex-shrink:0}
.flash-slash-menu-item-icon svg{width:18px;height:18px;color:var(--flash-text-muted,#6c757d)}
.flash-slash-menu-item-text{display:flex;flex-direction:column;min-width:0}
.flash-slash-menu-item-label{font-size:14px;font-weight:500;color:var(--flash-text,#1a1a2e);line-height:1.3}
.flash-slash-menu-item-desc{font-size:12px;color:var(--flash-text-muted,#6c757d);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.flash-slash-empty{padding:16px;text-align:center;color:var(--flash-text-muted,#999);font-size:13px}
`;

// ---- SlashCommand class ----

export class SlashCommand {
  readonly dom: HTMLElement;
  private _editor: Editor;
  private _container: HTMLElement;
  private _items: SlashCommandItemConfig[];
  private _trigger: string;
  private _visible = false;
  private _query = '';
  private _selectedIndex = 0;
  private _filteredItems: SlashCommandItemConfig[] = [];
  private _triggerPos = -1;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onInput: () => void;

  constructor(config: SlashCommandConfig) {
    this._editor = config.editor;
    this._container = config.container;
    this._items = config.items ?? defaultSlashCommandItems;
    this._trigger = config.trigger ?? '/';

    injectCSS(SLASH_CSS, 'flash-slash-css');

    this.dom = el('div', { className: 'flash-slash-menu', attrs: { role: 'listbox', 'aria-label': 'Insert block' } });
    this._container.appendChild(this.dom);

    // Listen for trigger character
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onInput = this._handleInput.bind(this);

    // Attach to the editor's DOM element
    const editorDom = this._container.querySelector('.flash-editor') as HTMLElement | null;
    if (editorDom) {
      editorDom.addEventListener('keydown', this._onKeyDown as EventListener);
      editorDom.addEventListener('input', this._onInput);
    }
  }

  update(): void {
    if (!this._visible) return;
    // Check if cursor moved away from trigger position
    const { from } = this._editor.state.selection;
    if (from < this._triggerPos) {
      this._hide();
    }
  }

  destroy(): void {
    const editorDom = this._container.querySelector('.flash-editor');
    if (editorDom) {
      editorDom.removeEventListener('keydown', this._onKeyDown as EventListener);
      editorDom.removeEventListener('input', this._onInput);
    }
    this.dom.remove();
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (!this._visible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._selectedIndex = (this._selectedIndex + 1) % this._filteredItems.length;
        this._renderItems();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._selectedIndex = (this._selectedIndex - 1 + this._filteredItems.length) % this._filteredItems.length;
        this._renderItems();
        break;
      case 'Enter':
        e.preventDefault();
        this._executeItem(this._filteredItems[this._selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        this._hide();
        break;
    }
  }

  private _handleInput(): void {
    const state = this._editor.state;
    const { $from } = state.selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined);

    // Find the last trigger character
    const triggerIdx = textBefore.lastIndexOf(this._trigger);

    if (triggerIdx === -1) {
      if (this._visible) this._hide();
      return;
    }

    // Only trigger at start of line or after whitespace
    if (triggerIdx > 0 && textBefore[triggerIdx - 1] !== ' ' && textBefore[triggerIdx - 1] !== '\n') {
      if (this._visible) this._hide();
      return;
    }

    const query = textBefore.slice(triggerIdx + 1);

    // Don't show if query has spaces (user probably moved on)
    if (query.includes(' ')) {
      if (this._visible) this._hide();
      return;
    }

    this._query = query.toLowerCase();
    this._triggerPos = $from.pos - ($from.parentOffset - triggerIdx);
    this._selectedIndex = 0;
    this._filter();
    this._show();
  }

  private _filter(): void {
    if (this._query === '') {
      this._filteredItems = this._items;
    } else {
      this._filteredItems = this._items.filter((item) => {
        const q = this._query;
        if (item.label.toLowerCase().includes(q)) return true;
        if (item.description?.toLowerCase().includes(q)) return true;
        if (item.keywords?.some((kw) => kw.includes(q))) return true;
        return false;
      });
    }
  }

  private _show(): void {
    this._visible = true;
    this._renderItems();
    this.dom.classList.add('flash-visible');

    // Position below caret
    const caretRect = getCaretRect();
    if (caretRect) {
      const containerRect = this._container.getBoundingClientRect();
      const top = caretRect.bottom - containerRect.top + 4;
      const left = Math.max(4, caretRect.left - containerRect.left);
      this.dom.style.top = `${top}px`;
      this.dom.style.left = `${left}px`;
    }
  }

  private _hide(): void {
    this._visible = false;
    this._query = '';
    this._triggerPos = -1;
    this.dom.classList.remove('flash-visible');
  }

  private _renderItems(): void {
    this.dom.innerHTML = '';

    if (this._filteredItems.length === 0) {
      this.dom.appendChild(el('div', { className: 'flash-slash-empty', children: ['No results'] }));
      return;
    }

    for (let i = 0; i < this._filteredItems.length; i++) {
      const item = this._filteredItems[i];
      const iconHtml = item.icon
        ? (item.icon in icons ? icons[item.icon as IconName] : item.icon)
        : '';

      const row = el('button', {
        className: `flash-slash-menu-item${i === this._selectedIndex ? ' flash-selected' : ''}`,
        attrs: { type: 'button', role: 'option', 'aria-selected': i === this._selectedIndex ? 'true' : 'false' },
        onClick: () => this._executeItem(item),
      });

      if (iconHtml) {
        row.appendChild(el('div', { className: 'flash-slash-menu-item-icon', html: iconHtml }));
      }

      const textDiv = el('div', { className: 'flash-slash-menu-item-text' });
      textDiv.appendChild(el('div', { className: 'flash-slash-menu-item-label', children: [item.label] }));
      if (item.description) {
        textDiv.appendChild(el('div', { className: 'flash-slash-menu-item-desc', children: [item.description] }));
      }
      row.appendChild(textDiv);

      this.dom.appendChild(row);
    }
  }

  private _executeItem(item: SlashCommandItemConfig | undefined): void {
    if (!item) return;

    // Delete the trigger text (/ + query)
    if (this._triggerPos >= 0) {
      const { from } = this._editor.state.selection;
      const tr = this._editor.state.tr.delete(this._triggerPos, from);
      this._editor.dispatch(tr);
    }

    // Execute command
    if (item.onClick) {
      item.onClick(this._editor);
    } else if (item.command) {
      this._editor.command(item.command, ...(item.commandArgs ?? []));
    }

    this._hide();
  }
}
