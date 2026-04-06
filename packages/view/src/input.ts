import type { EditorView } from './editor-view';
import { TextSelection, AllSelection } from '@flash/state';
import type { Slice } from '@flash/model';

type KeyBinding = (view: EditorView) => boolean;

/**
 * InputHandler — manages keyboard, mouse, paste, drop, and IME input.
 */
export class InputHandler {
  private _keyBindings = new Map<string, KeyBinding[]>();
  private _listeners: Array<[string, EventListener]> = [];

  constructor(private view: EditorView) {
    this._bindEvents();
    this._registerDefaultKeyBindings();
  }

  registerKeyBinding(key: string, handler: KeyBinding): void {
    const existing = this._keyBindings.get(key) ?? [];
    existing.push(handler);
    this._keyBindings.set(key, existing);
  }

  destroy(): void {
    for (const [event, listener] of this._listeners) {
      this.view.dom.removeEventListener(event, listener);
    }
    this._listeners = [];
  }

  private _on(event: string, handler: EventListener): void {
    this.view.dom.addEventListener(event, handler);
    this._listeners.push([event, handler]);
  }

  private _bindEvents(): void {
    this._on('keydown', this._onKeyDown.bind(this));
    this._on('beforeinput', this._onBeforeInput.bind(this));
    this._on('compositionstart', this._onCompositionStart.bind(this));
    this._on('compositionend', this._onCompositionEnd.bind(this));
    this._on('paste', this._onPaste.bind(this));
    this._on('drop', this._onDrop.bind(this));
    this._on('mousedown', this._onMouseDown.bind(this));

    // Selection changes via document listener
    const selHandler = this._onSelectionChange.bind(this);
    document.addEventListener('selectionchange', selHandler);
    this._listeners.push(['selectionchange', selHandler as EventListener]);
  }

  // ---- Keyboard ----

  private _onKeyDown(event: Event): void {
    const e = event as KeyboardEvent;
    if (this.view.composing) return;

    const key = this._normalizeKey(e);
    const handlers = this._keyBindings.get(key);
    if (handlers) {
      for (const handler of handlers) {
        if (handler(this.view)) {
          e.preventDefault();
          return;
        }
      }
    }

    // Check plugin props
    for (const plugin of this.view.state.plugins) {
      if (plugin.spec.props?.handleKeyDown?.(this.view.state, e)) {
        e.preventDefault();
        return;
      }
    }
  }

  private _normalizeKey(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Mod');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = e.key;
    if (key.length === 1) {
      parts.push(key.toLowerCase());
    } else {
      parts.push(key);
    }

    return parts.join('-');
  }

  // ---- BeforeInput (modern input events) ----

  private _onBeforeInput(event: Event): void {
    const e = event as InputEvent;
    if (this.view.composing) return;

    const state = this.view.state;
    const { from, to } = state.selection;

    switch (e.inputType) {
      case 'insertText': {
        if (e.data) {
          e.preventDefault();
          const tr = state.tr;
          if (from !== to) tr.delete(from, to);
          tr.insertText(from, e.data);
          const newPos = from + e.data.length;
          tr.setSelection(TextSelection.create(tr.doc, newPos));
          this.view.dispatch(tr);
        }
        break;
      }

      case 'insertParagraph':
      case 'insertLineBreak': {
        e.preventDefault();
        this._splitBlock();
        break;
      }

      case 'deleteContentBackward': {
        e.preventDefault();
        this._deleteBackward();
        break;
      }

      case 'deleteContentForward': {
        e.preventDefault();
        this._deleteForward();
        break;
      }

      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward': {
        e.preventDefault();
        this._deleteToLineStart();
        break;
      }

      case 'deleteWordBackward': {
        e.preventDefault();
        this._deleteWordBackward();
        break;
      }

      case 'deleteWordForward': {
        e.preventDefault();
        this._deleteWordForward();
        break;
      }
    }
  }

  // ---- IME Composition ----

  private _onCompositionStart(_event: Event): void {
    this.view.setComposing(true);
  }

  private _onCompositionEnd(event: Event): void {
    this.view.setComposing(false);
    const e = event as CompositionEvent;

    // Read the composed text from DOM and apply to model
    if (e.data) {
      const state = this.view.state;
      const { from, to } = state.selection;
      const tr = state.tr;
      if (from !== to) tr.delete(from, to);
      tr.insertText(from, e.data);
      const newPos = from + e.data.length;
      tr.setSelection(TextSelection.create(tr.doc, newPos));
      this.view.dispatch(tr);
    }
  }

  // ---- Paste ----

  private _onPaste(event: Event): void {
    const e = event as ClipboardEvent;
    e.preventDefault();

    // Check plugin props
    for (const plugin of this.view.state.plugins) {
      if (plugin.spec.props?.handlePaste?.(this.view.state, e)) return;
    }

    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');

    if (html) {
      this._insertHTML(html);
    } else if (text) {
      this._insertText(text);
    }
  }

  // ---- Drop ----

  private _onDrop(event: Event): void {
    const e = event as DragEvent;

    for (const plugin of this.view.state.plugins) {
      if (plugin.spec.props?.handleDrop?.(this.view.state, e)) {
        e.preventDefault();
        return;
      }
    }

    const html = e.dataTransfer?.getData('text/html');
    const text = e.dataTransfer?.getData('text/plain');

    if (html || text) {
      e.preventDefault();
      const pos = this.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (pos !== null) {
        if (html) {
          this._insertHTMLAt(html, pos);
        } else if (text) {
          this._insertTextAt(text, pos);
        }
      }
    }
  }

  // ---- Mouse ----

  private _onMouseDown(event: Event): void {
    const e = event as MouseEvent;

    // Check plugin props
    const pos = this.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (pos !== null) {
      for (const plugin of this.view.state.plugins) {
        if (plugin.spec.props?.handleClick?.(this.view.state, pos, e)) {
          e.preventDefault();
          return;
        }
      }
    }
    // Let browser handle normal selection via mousedown
  }

  // ---- Selection change ----

  private _onSelectionChange(): void {
    if (this.view.composing) return;
    if (!this.view.dom.contains(document.activeElement) &&
        !this.view.dom.contains(window.getSelection()?.anchorNode ?? null)) {
      return;
    }

    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) return;

    try {
      const anchor = this.view.posFromDOM(domSel.anchorNode!, domSel.anchorOffset);
      const head = domSel.isCollapsed
        ? anchor
        : this.view.posFromDOM(domSel.focusNode!, domSel.focusOffset);

      const currentSel = this.view.state.selection;
      if (currentSel.anchor === anchor && currentSel.head === head) return;

      const tr = this.view.state.tr;
      tr.setSelection(TextSelection.create(tr.doc, anchor, head));
      this.view.dispatch(tr);
    } catch {
      // Position resolution can fail if DOM is out of sync, ignore
    }
  }

  // ---- Editing operations ----

  private _splitBlock(): void {
    const state = this.view.state;
    const { from, to, $from } = state.selection;
    const tr = state.tr;

    if (from !== to) tr.delete(from, to);

    // Find the block parent and split it
    const blockParent = $from.parent;
    if (blockParent.type.isTextblock) {
      const endOfBlock = $from.end();
      const afterContent = blockParent.content.cut($from.parentOffset);
      const newBlock = blockParent.type.create(undefined, afterContent);

      // Delete content after cursor, then insert new block after current block
      tr.delete(from, from + ($from.end() - $from.pos));
      tr.insert(from + 1, newBlock);
      tr.setSelection(TextSelection.create(tr.doc, from + 2));
    }

    this.view.dispatch(tr);
  }

  private _deleteBackward(): void {
    const state = this.view.state;
    const { from, to } = state.selection;
    const tr = state.tr;

    if (from !== to) {
      tr.delete(from, to);
      tr.setSelection(TextSelection.create(tr.doc, from));
    } else if (from > 0) {
      tr.delete(from - 1, from);
      tr.setSelection(TextSelection.create(tr.doc, from - 1));
    }

    this.view.dispatch(tr);
  }

  private _deleteForward(): void {
    const state = this.view.state;
    const { from, to } = state.selection;
    const tr = state.tr;

    if (from !== to) {
      tr.delete(from, to);
      tr.setSelection(TextSelection.create(tr.doc, from));
    } else if (to < state.doc.content.size) {
      tr.delete(from, from + 1);
    }

    this.view.dispatch(tr);
  }

  private _deleteToLineStart(): void {
    const state = this.view.state;
    const { from } = state.selection;
    const $pos = state.doc.resolve(from);
    const lineStart = $pos.start($pos.depth);
    const tr = state.tr;
    if (from > lineStart) {
      tr.delete(lineStart, from);
      tr.setSelection(TextSelection.create(tr.doc, lineStart));
      this.view.dispatch(tr);
    }
  }

  private _deleteWordBackward(): void {
    const state = this.view.state;
    const { from, to } = state.selection;
    const tr = state.tr;

    if (from !== to) {
      tr.delete(from, to);
      tr.setSelection(TextSelection.create(tr.doc, from));
    } else {
      const $pos = state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset);
      const match = /\S+\s*$/.exec(textBefore);
      const deleteLen = match ? match[0].length : 1;
      const deleteFrom = from - deleteLen;
      tr.delete(deleteFrom, from);
      tr.setSelection(TextSelection.create(tr.doc, deleteFrom));
    }

    this.view.dispatch(tr);
  }

  private _deleteWordForward(): void {
    const state = this.view.state;
    const { from, to } = state.selection;
    const tr = state.tr;

    if (from !== to) {
      tr.delete(from, to);
      tr.setSelection(TextSelection.create(tr.doc, from));
    } else {
      const $pos = state.doc.resolve(from);
      const textAfter = $pos.parent.textBetween($pos.parentOffset, $pos.parent.content.size);
      const match = /^\s*\S+/.exec(textAfter);
      const deleteLen = match ? match[0].length : 1;
      tr.delete(from, from + deleteLen);
    }

    this.view.dispatch(tr);
  }

  private _insertText(text: string): void {
    const state = this.view.state;
    const { from, to } = state.selection;
    const tr = state.tr;
    if (from !== to) tr.delete(from, to);

    // Split by newlines to create paragraphs
    const lines = text.split(/\r?\n/);
    if (lines.length === 1) {
      tr.insertText(from, text);
      tr.setSelection(TextSelection.create(tr.doc, from + text.length));
    } else {
      let pos = from;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]) {
          tr.insertText(pos, lines[i]);
          pos += lines[i].length;
        }
        if (i < lines.length - 1) {
          // Insert paragraph break
          const paraType = state.schema.nodes['paragraph'];
          if (paraType) {
            const newPara = paraType.create();
            tr.insert(pos + 1, newPara);
            pos += 2;
          }
        }
      }
      tr.setSelection(TextSelection.create(tr.doc, pos));
    }

    this.view.dispatch(tr);
  }

  private _insertTextAt(text: string, pos: number): void {
    const tr = this.view.state.tr;
    tr.insertText(pos, text);
    tr.setSelection(TextSelection.create(tr.doc, pos + text.length));
    this.view.dispatch(tr);
  }

  private _insertHTML(_html: string): void {
    // TODO: Use FlashDOMParser to parse HTML and insert as document content
    // For now, fall back to plain text
    const temp = document.createElement('div');
    temp.innerHTML = _html;
    this._insertText(temp.textContent ?? '');
  }

  private _insertHTMLAt(_html: string, pos: number): void {
    const temp = document.createElement('div');
    temp.innerHTML = _html;
    this._insertTextAt(temp.textContent ?? '', pos);
  }

  // ---- Default key bindings ----

  private _registerDefaultKeyBindings(): void {
    this.registerKeyBinding('Enter', (view) => {
      this._splitBlock();
      return true;
    });

    this.registerKeyBinding('Backspace', (view) => {
      this._deleteBackward();
      return true;
    });

    this.registerKeyBinding('Delete', (view) => {
      this._deleteForward();
      return true;
    });

    this.registerKeyBinding('Mod-a', (view) => {
      const tr = view.state.tr;
      tr.setSelection(new AllSelection(tr.doc));
      view.dispatch(tr);
      return true;
    });

    this.registerKeyBinding('Mod-z', (view) => {
      // Will be handled by History plugin
      return false;
    });

    this.registerKeyBinding('Mod-Shift-z', (view) => {
      // Will be handled by History plugin
      return false;
    });
  }
}
