import { NodeExtension } from '@flash/core';
import { wrapIn, lift } from '@flash/commands';

export const OrderedList = NodeExtension.create({
  name: 'ordered_list',
  nodeSpec: () => ({
    content: 'list_item+',
    group: 'block',
    attrs: { start: { default: 1 } },
    parseDOM: [{
      tag: 'ol',
      getAttrs: (el) => ({
        start: (el as HTMLOListElement).start ?? 1,
      }),
    }],
    toDOM: (node) => {
      const start = node.attrs.start as number;
      return start === 1 ? ['ol', 0] : ['ol', { start: String(start) }, 0];
    },
  }),
  addCommands: () => ({
    toggleOrderedList: () =>
      (state, dispatch) => {
        const listType = state.schema.nodes['ordered_list'];
        if (!listType) return false;
        const { $from } = state.selection;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type === listType) {
            return lift(state, dispatch);
          }
        }
        return wrapIn(listType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-7': (state, dispatch) => {
      const listType = state.schema.nodes['ordered_list'];
      if (!listType) return false;
      const { $from } = state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type === listType) {
          return lift(state, dispatch);
        }
      }
      return wrapIn(listType)(state, dispatch);
    },
  }),
});
