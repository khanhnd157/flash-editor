import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Code = MarkExtension.create({
  name: 'code',
  markSpec: () => ({
    excludes: '_',
    parseDOM: [{ tag: 'code' }],
    toDOM: () => ['code', 0],
  }),
  addCommands: () => ({
    toggleCode: () =>
      (state, dispatch) => {
        const codeType = state.schema.marks['code'];
        if (!codeType) return false;
        return toggleMark(codeType)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-e': (state, dispatch) => {
      const codeType = state.schema.marks['code'];
      if (!codeType) return false;
      return toggleMark(codeType)(state, dispatch);
    },
  }),
});
