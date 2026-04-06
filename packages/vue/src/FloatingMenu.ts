import { defineComponent, h, type PropType, type VNode } from 'vue';
import type { Editor } from '@flash/core';

export const FloatingMenu = defineComponent({
  name: 'FloatingMenu',
  props: {
    editor: {
      type: Object as PropType<Editor | null>,
      default: null,
    },
    class: {
      type: String,
      default: undefined,
    },
    offset: {
      type: Number,
      default: 8,
    },
  },
  setup(props, { slots }) {
    return (): VNode | null => {
      const { editor, offset } = props;
      if (!editor) return null;

      const { selection } = editor.state;
      if (!selection.empty) return null;

      const $pos = editor.state.doc.resolve(selection.anchor);
      const parent = $pos.parent;
      if (parent.content.size !== 0) return null;

      const domSel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (!domSel || domSel.rangeCount === 0) return null;

      const range = domSel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.height === 0) return null;

      return h(
        'div',
        {
          class: props.class,
          style: {
            position: 'fixed',
            top: `${rect.top}px`,
            left: `${rect.left - offset}px`,
            transform: 'translateX(-100%)',
            zIndex: 50,
          },
        },
        slots.default?.(),
      );
    };
  },
});
