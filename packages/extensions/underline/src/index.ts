import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Underline = MarkExtension.create({
  name: 'underline',
  markSpec: () => ({
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration', getAttrs: (value) => (value as string).includes('underline') ? {} : false },
    ],
    toDOM: () => ['u', 0],
  }),
  addCommands: () => ({
    toggleUnderline: () =>
      (state, dispatch) => {
        const underlineType = state.schema.marks['underline'];
        if (!underlineType) return false;
        return toggleMark(underlineType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-u': (state, dispatch) => {
      const underlineType = state.schema.marks['underline'];
      if (!underlineType) return false;
      return toggleMark(underlineType)(state, dispatch);
    },
  }),
});
