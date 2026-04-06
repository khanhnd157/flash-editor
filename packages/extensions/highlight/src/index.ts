import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export const Highlight = MarkExtension.create({
  name: 'highlight',
  markSpec: () => ({
    attrs: { color: { default: null } },
    parseDOM: [{
      tag: 'mark',
      getAttrs: (el) => ({
        color: (el as HTMLElement).style.backgroundColor || null,
      }),
    }],
    toDOM: (mark) => {
      const color = mark.attrs.color as string | null;
      return color
        ? ['mark', { style: `background-color: ${color}` }, 0]
        : ['mark', 0];
    },
  }),
  addCommands: () => ({
    toggleHighlight: (attrs: unknown) =>
      (state, dispatch) => {
        const highlightType = state.schema.marks['highlight'];
        if (!highlightType) return false;
        return toggleMark(highlightType, attrs as Record<string, unknown>)(state, dispatch);
      },
  }),
});
