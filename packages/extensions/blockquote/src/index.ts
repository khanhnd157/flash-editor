import { NodeExtension } from '@flash/core';
import { wrapIn, lift } from '@flash/commands';

export const Blockquote = NodeExtension.create({
  name: 'blockquote',
  nodeSpec: () => ({
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0] as const,
  }),
  addCommands: () => ({
    setBlockquote: () =>
      (state, dispatch) => {
        const bqType = state.schema.nodes['blockquote'];
        if (!bqType) return false;
        return wrapIn(bqType)(state, dispatch);
      },
    toggleBlockquote: () =>
      (state, dispatch) => {
        const bqType = state.schema.nodes['blockquote'];
        if (!bqType) return false;
        const { $from } = state.selection;
        // Check if already in a blockquote
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type === bqType) {
            return lift(state, dispatch);
          }
        }
        return wrapIn(bqType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-b': (state, dispatch) => {
      const bqType = state.schema.nodes['blockquote'];
      if (!bqType) return false;
      const { $from } = state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type === bqType) {
          return lift(state, dispatch);
        }
      }
      return wrapIn(bqType)(state, dispatch);
    },
  }),
});
