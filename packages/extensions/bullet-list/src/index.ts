import { NodeExtension } from '@flash/core';
import { wrapIn, lift } from '@flash/commands';

export const BulletList = NodeExtension.create({
  name: 'bullet_list',
  nodeSpec: () => ({
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0] as const,
  }),
  addCommands: () => ({
    toggleBulletList: () =>
      (state, dispatch) => {
        const listType = state.schema.nodes['bullet_list'];
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
    'Mod-Shift-8': (state, dispatch) => {
      const listType = state.schema.nodes['bullet_list'];
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
