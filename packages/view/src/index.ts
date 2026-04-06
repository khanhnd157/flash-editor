// Virtual DOM
export { type VNode, type VText, type VChild, h, t, isVText } from './vnode';
export { createDOM, patch } from './dom';

// Node views & rendering
export { ViewDescSet, renderDoc } from './node-view';
export type { MarkViewDesc, NodeViewDesc, CustomNodeView } from './node-view';

// Decorations
export { DecorationSet } from './decoration';
export type { InlineDecoration, WidgetDecoration, NodeDecoration, Decoration, DecorationSource } from './decoration';

// DOM parsing
export { FlashDOMParser, FlashDOMSerializer } from './dom-parser';

// Editor view
export { EditorView } from './editor-view';
export type { EditorViewConfig } from './editor-view';

// Input handling
export { InputHandler } from './input';

// History
export { history, undo, redo, undoDepth, redoDepth } from './history';

// Performance
export { LazyRenderer, DirtyTracker, VNodePool } from './lazy-render';
export type { LazyRenderConfig } from './lazy-render';
