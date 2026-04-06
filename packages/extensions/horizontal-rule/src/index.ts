import { NodeExtension } from '@flash/core';

export const HorizontalRule = NodeExtension.create({
  name: 'horizontal_rule',
  nodeSpec: () => ({
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr'] as const,
  }),
  addCommands: () => ({
    setHorizontalRule: () =>
      (state, dispatch) => {
        const hrType = state.schema.nodes['horizontal_rule'];
        if (!hrType) return false;
        if (!dispatch) return true;
        const { from, to } = state.selection;
        const tr = state.tr;
        if (from !== to) tr.delete(from, to);
        tr.insert(from, hrType.create());
        dispatch(tr);
        return true;
      },
  }),
});
