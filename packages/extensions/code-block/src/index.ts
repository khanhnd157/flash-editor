import { NodeExtension } from '@flash/core';
import { setBlockType } from '@flash/commands';

export interface CodeBlockOptions {
  languageClassPrefix: string;
}

export const CodeBlock = NodeExtension.create({
  name: 'code_block',
  addOptions: () => ({ languageClassPrefix: 'language-' }),
  nodeSpec: () => ({
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    defining: true,
    attrs: { language: { default: null } },
    parseDOM: [{
      tag: 'pre',
      getAttrs: (el) => {
        const code = (el as HTMLElement).querySelector('code');
        const cls = code?.className ?? '';
        const match = /language-(\S+)/.exec(cls);
        return { language: match ? match[1] : null };
      },
    }],
    toDOM: (node) => {
      const lang = node.attrs.language as string | null;
      const codeAttrs = lang ? { class: `language-${lang}` } : {};
      return ['pre', ['code', codeAttrs, 0]] as const;
    },
  }),
  addCommands: () => ({
    setCodeBlock: (attrs: unknown) =>
      (state, dispatch) => {
        const codeBlockType = state.schema.nodes['code_block'];
        if (!codeBlockType) return false;
        return setBlockType(codeBlockType, attrs as Record<string, unknown>)(state, dispatch);
      },
    toggleCodeBlock: (attrs: unknown) =>
      (state, dispatch) => {
        const codeBlockType = state.schema.nodes['code_block'];
        const paragraphType = state.schema.nodes['paragraph'];
        if (!codeBlockType || !paragraphType) return false;
        const { $from } = state.selection;
        if ($from.parent.type === codeBlockType) {
          return setBlockType(paragraphType)(state, dispatch);
        }
        return setBlockType(codeBlockType, attrs as Record<string, unknown>)(state, dispatch);
      },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-Shift-e': (state, dispatch) => {
      const codeBlockType = state.schema.nodes['code_block'];
      const paragraphType = state.schema.nodes['paragraph'];
      if (!codeBlockType || !paragraphType) return false;
      const { $from } = state.selection;
      if ($from.parent.type === codeBlockType) {
        return setBlockType(paragraphType)(state, dispatch);
      }
      return setBlockType(codeBlockType)(state, dispatch);
    },
  }),
});
