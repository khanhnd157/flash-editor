import { NodeExtension } from '@flash/core';
import { setBlockType } from '@flash/commands';

export const Paragraph = NodeExtension.create({
  name: 'paragraph',
  nodeSpec: () => ({
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0] as const,
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-0': (state, dispatch) => {
      const paragraphType = state.schema.nodes['paragraph'];
      if (!paragraphType) return false;
      return setBlockType(paragraphType)(state, dispatch);
    },
  }),
});
