import { NodeExtension } from '@flash/core';

export const HardBreak = NodeExtension.create({
  name: 'hard_break',
  nodeSpec: () => ({
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'] as const,
  }),
  addCommands: () => ({
    setHardBreak: () =>
      (state, dispatch) => {
        const brType = state.schema.nodes['hard_break'];
        if (!brType) return false;
        if (!dispatch) return true;
        const { from, to } = state.selection;
        const tr = state.tr;
        if (from !== to) tr.delete(from, to);
        tr.insert(from, brType.create());
        dispatch(tr);
        return true;
      },
  }),
  addKeyboardShortcuts: () => ({
    'Shift-Enter': (state, dispatch) => {
      const brType = state.schema.nodes['hard_break'];
      if (!brType) return false;
      if (!dispatch) return true;
      const { from, to } = state.selection;
      const tr = state.tr;
      if (from !== to) tr.delete(from, to);
      tr.insert(from, brType.create());
      dispatch(tr);
      return true;
    },
  }),
});
