import type { Node as DocNode, MarkType, NodeType, Schema } from '@flash/model';
import { Fragment, Slice } from '@flash/model';
import type { EditorState, Transaction } from '@flash/state';
import { TextSelection, NodeSelection, AllSelection } from '@flash/state';

export type Command = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
) => boolean;

// ---- Selection commands ----

export function selectAll(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  if (dispatch) {
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
  }
  return true;
}

export function deleteSelection(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { from, to, empty } = state.selection;
  if (empty) return false;
  if (dispatch) {
    const tr = state.tr.delete(from, to);
    tr.setSelection(TextSelection.create(tr.doc, from));
    dispatch(tr);
  }
  return true;
}

// ---- Mark commands ----

export function toggleMark(markType: MarkType, attrs?: Record<string, unknown>): Command {
  return (state, dispatch) => {
    const { from, to, empty, $from } = state.selection;

    // Check if mark is allowed on the current node
    if (empty) {
      if (!markType.isInSet(state.storedMarks ?? $from.marks())) {
        if (!$from.parent.type.allowsMarkType(markType)) return false;
      }
    } else {
      let allowed = false;
      state.doc.nodesBetween(from, to, (node) => {
        if (allowed) return false;
        if (node.isText && node.type.schema.marks[markType.name]) {
          allowed = true;
        }
      });
      if (!allowed) return false;
    }

    if (!dispatch) return true;

    const tr = state.tr;
    if (empty) {
      // Toggle stored marks
      const current = state.storedMarks ?? $from.marks();
      const mark = markType.create(attrs);
      if (markType.isInSet(current)) {
        tr.setStoredMarks(current.filter((m) => m.type !== markType));
      } else {
        tr.setStoredMarks([...current, mark]);
      }
    } else {
      // Check if the mark is active in the selection
      const has = state.doc.rangeHasMark(from, to, markType);
      if (has) {
        tr.removeMark(from, to, markType);
      } else {
        tr.addMark(from, to, markType.create(attrs));
      }
    }

    dispatch(tr);
    return true;
  };
}

export function setMark(markType: MarkType, attrs?: Record<string, unknown>): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (empty) return false;
    if (!dispatch) return true;
    dispatch(state.tr.addMark(from, to, markType.create(attrs)));
    return true;
  };
}

export function unsetMark(markType: MarkType): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (empty) return false;
    if (!dispatch) return true;
    dispatch(state.tr.removeMark(from, to, markType));
    return true;
  };
}

// ---- Block commands ----

export function setBlockType(nodeType: NodeType, attrs?: Record<string, unknown>): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    let applicable = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
      if (applicable) return false;
      if (node.isTextblock && node.type !== nodeType) {
        // Check if we can change the type
        const $pos = state.doc.resolve(pos);
        const index = $pos.index();
        if ($pos.parent.canReplaceWith(index, index + 1, nodeType)) {
          applicable = true;
        }
      }
    });

    if (!applicable) return false;
    if (!dispatch) return true;

    const tr = state.tr;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isTextblock && node.type !== nodeType) {
        const $pos = tr.doc.resolve(tr.mapping.map(pos));
        const mappedPos = $pos.pos;

        // Delete old block, insert new one with same content
        const start = mappedPos;
        const end = mappedPos + node.nodeSize;
        const newNode = nodeType.create(attrs, node.content, node.marks);
        tr.replaceWith(start, end, newNode);
      }
    });

    dispatch(tr);
    return true;
  };
}

export function wrapIn(nodeType: NodeType, attrs?: Record<string, unknown>): Command {
  return (state, dispatch) => {
    const { $from, $to } = state.selection;

    // Find the range to wrap
    const depth = $from.sharedDepth($to.pos);
    const parent = $from.node(depth);
    const startIndex = $from.index(depth);
    const endIndex = $to.index(depth) + ($to.pos === $to.end(depth) ? 0 : 1);

    // Check if wrapping is valid
    if (!parent.canReplaceWith(startIndex, endIndex, nodeType)) return false;
    if (!dispatch) return true;

    const tr = state.tr;
    const from = $from.before(depth + 1);
    const to = $to.after(depth + 1);

    // Collect nodes to wrap
    const nodes: DocNode[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      nodes.push(parent.child(i));
    }

    const wrapped = nodeType.create(attrs, Fragment.from(nodes));
    tr.replaceWith(from, to, wrapped);

    dispatch(tr);
    return true;
  };
}

export function lift(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { $from, $to } = state.selection;

  // Find the deepest block that can be lifted
  const depth = $from.sharedDepth($to.pos);
  if (depth <= 1) return false; // Can't lift from root

  const parent = $from.node(depth - 1);
  const grandparent = $from.node(depth - 2);

  const indexInGP = $from.index(depth - 2);

  // Check if the grandparent can accept the children directly
  const startIndex = $from.index(depth - 1);
  const endIndex = $to.index(depth - 1) + 1;

  // Simplistic lift: unwrap one level
  if (!dispatch) return true;

  const tr = state.tr;
  const from = $from.before(depth);
  const to = $from.after(depth);

  // Get the content of the wrapper
  const content = parent.content;
  tr.replaceWith(from, to, content);

  dispatch(tr);
  return true;
}

export function joinBackward(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor || $cursor.parentOffset > 0) return false;

  // At the start of a textblock — try to join with block before
  const before = $cursor.nodeBefore;
  if (!before) return false;

  if (!dispatch) return true;

  const tr = state.tr;
  const joinPos = $cursor.pos - 1;
  tr.delete(joinPos, joinPos + 1);
  dispatch(tr);
  return true;
}

export function joinForward(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { $cursor } = state.selection as TextSelection;
  if (!$cursor) return false;

  const parent = $cursor.parent;
  if ($cursor.parentOffset < parent.content.size) return false;

  // At the end of a textblock — try to join with block after
  const after = $cursor.nodeAfter;
  if (!after) return false;

  if (!dispatch) return true;

  const tr = state.tr;
  const joinPos = $cursor.pos;
  tr.delete(joinPos, joinPos + 1);
  dispatch(tr);
  return true;
}

export function splitBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { $from, $to, from, to } = state.selection;
  if (!$from.parent.isTextblock) return false;

  if (!dispatch) return true;

  const tr = state.tr;

  // Delete selection if non-empty
  if (from !== to) tr.delete(from, to);

  const $pos = tr.doc.resolve(from);
  const parent = $pos.parent;
  const after = parent.content.cut($pos.parentOffset);
  const defType = $pos.parent.type.contentMatch.defaultType;
  const newBlock = (defType ?? parent.type).create(undefined, after.size > 0 ? after : undefined);

  // Remove content after cursor in current block, insert new block
  tr.delete(from, from + (parent.content.size - $pos.parentOffset));
  tr.insert(from + 1, newBlock);
  tr.setSelection(TextSelection.create(tr.doc, from + 2));

  dispatch(tr);
  return true;
}

// ---- Content commands ----

export function insertContent(content: DocNode | DocNode[]): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    if (!dispatch) return true;

    const tr = state.tr;
    if (from !== to) tr.delete(from, to);

    const nodes = Array.isArray(content) ? content : [content];
    for (const node of nodes) {
      tr.insert(from, node);
    }

    dispatch(tr);
    return true;
  };
}

export function insertText(text: string): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    if (!dispatch) return true;

    const tr = state.tr;
    if (from !== to) tr.delete(from, to);
    tr.insertText(from, text);
    tr.setSelection(TextSelection.create(tr.doc, from + text.length));
    dispatch(tr);
    return true;
  };
}

// ---- Node type checking helpers ----

export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { from, to, empty, $from } = state.selection;

  if (empty) {
    const storedMarks = state.storedMarks ?? $from.marks();
    return !!markType.isInSet(storedMarks);
  }

  return state.doc.rangeHasMark(from, to, markType);
}

export function isBlockActive(state: EditorState, nodeType: NodeType, attrs?: Record<string, unknown>): boolean {
  const { $from } = state.selection;

  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type === nodeType) {
      if (!attrs) return true;
      return Object.entries(attrs).every(([k, v]) => node.attrs[k] === v);
    }
  }

  return false;
}
