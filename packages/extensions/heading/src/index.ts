import { NodeExtension } from '@flash/core';
import { setBlockType } from '@flash/commands';

export interface HeadingOptions {
  levels: number[];
}

export const Heading = NodeExtension.create({
  name: 'heading',
  addOptions: () => ({ levels: [1, 2, 3, 4, 5, 6] }),
  nodeSpec: () => ({
    content: 'inline*',
    group: 'block',
    attrs: { level: { default: 1 } },
    defining: true,
    parseDOM: [
      { tag: 'h1', getAttrs: () => ({ level: 1 }) },
      { tag: 'h2', getAttrs: () => ({ level: 2 }) },
      { tag: 'h3', getAttrs: () => ({ level: 3 }) },
      { tag: 'h4', getAttrs: () => ({ level: 4 }) },
      { tag: 'h5', getAttrs: () => ({ level: 5 }) },
      { tag: 'h6', getAttrs: () => ({ level: 6 }) },
    ],
    toDOM: (node) => [`h${node.attrs.level}`, 0] as const,
  }),
  addCommands: () => ({
    setHeading: (attrs: unknown) =>
      (state, dispatch) => {
        const headingType = state.schema.nodes['heading'];
        if (!headingType) return false;
        return setBlockType(headingType, attrs as Record<string, unknown>)(state, dispatch);
      },
    toggleHeading: (attrs: unknown) =>
      (state, dispatch) => {
        const headingType = state.schema.nodes['heading'];
        const paragraphType = state.schema.nodes['paragraph'];
        if (!headingType || !paragraphType) return false;
        const { $from } = state.selection;
        const isActive = $from.parent.type === headingType &&
          $from.parent.attrs.level === (attrs as Record<string, unknown>)?.level;
        if (isActive) {
          return setBlockType(paragraphType)(state, dispatch);
        }
        return setBlockType(headingType, attrs as Record<string, unknown>)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-1': (state, dispatch) => {
      const headingType = state.schema.nodes['heading'];
      if (!headingType) return false;
      return setBlockType(headingType, { level: 1 })(state, dispatch);
    },
    'Mod-Shift-2': (state, dispatch) => {
      const headingType = state.schema.nodes['heading'];
      if (!headingType) return false;
      return setBlockType(headingType, { level: 2 })(state, dispatch);
    },
    'Mod-Shift-3': (state, dispatch) => {
      const headingType = state.schema.nodes['heading'];
      if (!headingType) return false;
      return setBlockType(headingType, { level: 3 })(state, dispatch);
    },
  }),
});
