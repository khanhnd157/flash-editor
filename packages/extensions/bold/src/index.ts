import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Bold = MarkExtension.create({
  name: 'bold',
  markSpec: () => ({
    parseDOM: [
      { tag: 'strong' },
      { tag: 'b' },
      { style: 'font-weight', getAttrs: (value) => /^(bold|[7-9]\d{2,})$/.test(value as string) ? {} : false },
    ],
    toDOM: () => ['strong', 0],
  }),
  addCommands: () => ({
    toggleBold: () =>
      (state, dispatch) => {
        const boldType = state.schema.marks['bold'];
        if (!boldType) return false;
        return toggleMark(boldType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-b': (state, dispatch) => {
      const boldType = state.schema.marks['bold'];
      if (!boldType) return false;
      return toggleMark(boldType)(state, dispatch);
    },
  }),
});
