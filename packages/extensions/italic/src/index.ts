import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Italic = MarkExtension.create({
  name: 'italic',
  markSpec: () => ({
    parseDOM: [
      { tag: 'em' },
      { tag: 'i' },
      { style: 'font-style', getAttrs: (value) => value === 'italic' ? {} : false },
    ],
    toDOM: () => ['em', 0],
  }),
  addCommands: () => ({
    toggleItalic: () =>
      (state, dispatch) => {
        const italicType = state.schema.marks['italic'];
        if (!italicType) return false;
        return toggleMark(italicType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-i': (state, dispatch) => {
      const italicType = state.schema.marks['italic'];
      if (!italicType) return false;
      return toggleMark(italicType)(state, dispatch);
    },
  }),
});
