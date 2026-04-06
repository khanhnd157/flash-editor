import type { Node as DocNode } from '@flash/model';
import type { EditorState, Transaction, Selection } from '@flash/state';
import { TextSelection } from '@flash/state';
import type { VChild, VNode } from './vnode';
import { createDOM, patch } from './dom';
import { renderDoc, ViewDescSet } from './node-view';
import { DecorationSet } from './decoration';
import type { DecorationSource, Decoration } from './decoration';
import { InputHandler } from './input';

export interface EditorViewConfig {
  state: EditorState;
  dispatchTransaction?: (tr: Transaction) => void;
  decorations?: (state: EditorState) => DecorationSource;
  nodeViews?: Record<string, import('./node-view').CustomNodeView>;
  editable?: boolean;
  attributes?: Record<string, string>;
}

export class EditorView {
  readonly dom: HTMLElement;
  private _state: EditorState;
  private _viewDescs: ViewDescSet;
  private _prevVTree: VNode | null = null;
  private _decorations: DecorationSource = DecorationSet.empty;
  private _config: EditorViewConfig;
  private _inputHandler: InputHandler;
  private _observer: MutationObserver | null = null;
  private _composing = false;
  private _editable: boolean;
  private _updating = false;

  constructor(place: HTMLElement, config: EditorViewConfig) {
    this._config = config;
    this._state = config.state;
    this._editable = config.editable ?? true;

    // Create editor root
    this.dom = document.createElement('div');
    this.dom.classList.add('flash-editor');
    this.dom.setAttribute('role', 'textbox');
    this.dom.setAttribute('aria-multiline', 'true');
    if (this._editable) {
      this.dom.contentEditable = 'true';
    }

    // Apply custom attributes
    if (config.attributes) {
      for (const [key, value] of Object.entries(config.attributes)) {
        this.dom.setAttribute(key, value);
      }
    }

    place.appendChild(this.dom);

    // Set up view descriptors
    this._viewDescs = new ViewDescSet();
    this._viewDescs.registerDefaults(this._state.schema);

    // Register custom node views
    if (config.nodeViews) {
      for (const [name, view] of Object.entries(config.nodeViews)) {
        this._viewDescs.registerCustomView(name, view);
      }
    }

    // Set up input handler
    this._inputHandler = new InputHandler(this);

    // Set up MutationObserver
    this._setupMutationObserver();

    // Initial render
    this._render();
  }

  get state(): EditorState {
    return this._state;
  }

  get editable(): boolean {
    return this._editable;
  }

  get composing(): boolean {
    return this._composing;
  }

  get viewDescs(): ViewDescSet {
    return this._viewDescs;
  }

  /**
   * Update the view with a new state.
   */
  updateState(state: EditorState): void {
    const prevState = this._state;
    this._state = state;

    // Update decorations
    if (this._config.decorations) {
      this._decorations = this._config.decorations(state);
    }

    // Re-render if doc changed
    if (state.doc !== prevState.doc) {
      this._render();
    }

    // Sync selection to DOM
    if (!this._composing) {
      this._syncSelectionToDOM();
    }
  }

  /**
   * Dispatch a transaction. Uses custom dispatch or default (apply + updateState).
   */
  dispatch(tr: Transaction): void {
    if (this._config.dispatchTransaction) {
      this._config.dispatchTransaction(tr);
    } else {
      this.updateState(this._state.apply(tr));
    }
  }

  /**
   * Set composing state (for IME input).
   */
  setComposing(composing: boolean): void {
    this._composing = composing;
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this.dom.focus();
  }

  /**
   * Destroy the editor view.
   */
  destroy(): void {
    this._inputHandler.destroy();
    this._observer?.disconnect();
    this.dom.remove();
  }

  // ---- DOM Position ↔ Model Position ----

  /**
   * Convert a DOM position (node + offset) to a model position.
   */
  posFromDOM(domNode: globalThis.Node, domOffset: number): number {
    return posFromDOM(this.dom, this._state.doc, domNode, domOffset);
  }

  /**
   * Convert a model position to a DOM position (node + offset).
   */
  domFromPos(pos: number): { node: globalThis.Node; offset: number } {
    return domFromPos(this.dom, this._state.doc, pos);
  }

  /**
   * Get the model position at the given screen coordinates.
   */
  posAtCoords(coords: { left: number; top: number }): number | null {
    if (typeof document.caretPositionFromPoint === 'function') {
      const cp = document.caretPositionFromPoint(coords.left, coords.top);
      if (cp) return this.posFromDOM(cp.offsetNode, cp.offset);
    } else if (typeof document.caretRangeFromPoint === 'function') {
      const range = document.caretRangeFromPoint(coords.left, coords.top);
      if (range) return this.posFromDOM(range.startContainer, range.startOffset);
    }
    return null;
  }

  // ---- Private rendering ----

  private _render(): void {
    this._updating = true;
    this._observer?.disconnect();

    const newVTree = renderDoc(this._state.doc, this._viewDescs, this._decorations);

    if (this._prevVTree) {
      patch(this.dom, this._prevVTree, newVTree);
    } else {
      // Initial render
      this.dom.textContent = '';
      for (const child of newVTree.children) {
        this.dom.appendChild(createDOM(child));
      }
      newVTree.dom = this.dom;
    }

    this._prevVTree = newVTree;
    this._reconnectObserver();
    this._updating = false;
  }

  private _syncSelectionToDOM(): void {
    const sel = this._state.selection;
    const domSel = window.getSelection();
    if (!domSel) return;

    try {
      const anchor = this.domFromPos(sel.anchor);
      const head = this.domFromPos(sel.head);

      if (sel.empty) {
        domSel.collapse(anchor.node, anchor.offset);
      } else {
        const range = document.createRange();
        range.setStart(anchor.node, anchor.offset);
        range.setEnd(head.node, head.offset);
        domSel.removeAllRanges();
        domSel.addRange(range);
      }
    } catch {
      // Position mapping may fail during rapid updates, ignore
    }
  }

  private _setupMutationObserver(): void {
    this._observer = new MutationObserver((mutations) => {
      if (this._updating || this._composing) return;
      this._handleDOMMutation(mutations);
    });
    this._reconnectObserver();
  }

  private _reconnectObserver(): void {
    this._observer?.observe(this.dom, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  private _handleDOMMutation(_mutations: MutationRecord[]): void {
    // DOM was mutated by browser (spellcheck, autocorrect, etc.)
    // Re-read the DOM content and reconcile with model
    // For now, just re-render to ensure consistency
    this._render();
    this._syncSelectionToDOM();
  }
}

// ---- Position conversion helpers ----

function posFromDOM(
  editorDOM: HTMLElement,
  doc: DocNode,
  domNode: globalThis.Node,
  domOffset: number,
): number {
  // Walk up from domNode to editorDOM, tracking the path
  const path = domPathToEditor(editorDOM, domNode);
  if (!path) return 0;

  // Walk down the document model following the DOM path
  let pos = 0;
  let node = doc;

  for (let i = 0; i < path.length; i++) {
    const childIndex = path[i];
    // Opening token
    pos += 1;
    for (let j = 0; j < childIndex && j < node.childCount; j++) {
      pos += node.child(j).nodeSize;
    }
    if (childIndex < node.childCount) {
      node = node.child(childIndex);
    }
  }

  // Add the offset within the leaf/text node
  if (node.isText) {
    pos += domOffset;
  } else if (domNode.nodeType === 3) {
    // Text node that's a child of an element
    pos += domOffset;
  }

  return pos;
}

function domFromPos(
  editorDOM: HTMLElement,
  doc: DocNode,
  pos: number,
): { node: globalThis.Node; offset: number } {
  // Resolve the position in the document model
  const $pos = doc.resolve(pos);
  const depth = $pos.depth;

  // Walk down the DOM tree following the resolved position path
  let domNode: globalThis.Node = editorDOM;

  for (let d = 1; d <= depth; d++) {
    const index = $pos.index(d - 1);
    const child = domNode.childNodes[index];
    if (!child) break;
    domNode = child;
  }

  // For text content, find the text node
  const textOffset = $pos.parentOffset;
  if ($pos.parent.isTextblock) {
    let offset = 0;
    for (let i = 0; i < domNode.childNodes.length; i++) {
      const child = domNode.childNodes[i];
      const textNode = findTextNode(child);
      if (textNode) {
        const len = textNode.textContent?.length ?? 0;
        if (offset + len >= textOffset) {
          return { node: textNode, offset: textOffset - offset };
        }
        offset += len;
      }
    }
    // Fallback: end of the node
    return { node: domNode, offset: domNode.childNodes.length };
  }

  return { node: domNode, offset: $pos.index(depth) };
}

function domPathToEditor(editorDOM: HTMLElement, domNode: globalThis.Node): number[] | null {
  const path: number[] = [];
  let current: globalThis.Node | null = domNode;

  while (current && current !== editorDOM) {
    const parent = current.parentNode;
    if (!parent) return null;

    let index = 0;
    let sib: globalThis.Node | null = parent.firstChild;
    while (sib && sib !== current) {
      // Only count element nodes for path (skip text nodes within marks)
      if (sib.nodeType === 1) index++;
      else if (sib.nodeType === 3) index++;
      sib = sib.nextSibling;
    }
    path.unshift(index);
    current = parent;
  }

  if (current !== editorDOM) return null;
  return path;
}

function findTextNode(node: globalThis.Node): globalThis.Text | null {
  if (node.nodeType === 3) return node as globalThis.Text;
  for (let i = 0; i < node.childNodes.length; i++) {
    const found = findTextNode(node.childNodes[i]);
    if (found) return found;
  }
  return null;
}
