import { NodeExtension } from '@flash/core';

export const ListItem = NodeExtension.create({
  name: 'list_item',
  nodeSpec: () => ({
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0] as const,
  }),
  addKeyboardShortcuts: () => ({
    'Enter': (state, dispatch) => {
      const { $from } = state.selection;
      // Only handle if inside a list item
      let inListItem = false;
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === 'list_item') {
          inListItem = true;
          break;
        }
      }
      if (!inListItem) return false;
      // Default split behavior handled by splitBlock
      return false;
    },
  }),
});
