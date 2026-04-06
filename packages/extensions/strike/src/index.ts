import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Strike = MarkExtension.create({
  name: 'strike',
  markSpec: () => ({
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { tag: 'strike' },
      { style: 'text-decoration', getAttrs: (value) => (value as string).includes('line-through') ? {} : false },
    ],
    toDOM: () => ['s', 0],
  }),
  addCommands: () => ({
    toggleStrike: () =>
      (state, dispatch) => {
        const strikeType = state.schema.marks['strike'];
        if (!strikeType) return false;
        return toggleMark(strikeType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-s': (state, dispatch) => {
      const strikeType = state.schema.marks['strike'];
      if (!strikeType) return false;
      return toggleMark(strikeType)(state, dispatch);
    },
  }),
});
