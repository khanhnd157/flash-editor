import { defineComponent, h, type PropType, type VNode } from 'vue';
import type { Editor } from '@flash/core';

export const BubbleMenu = defineComponent({
  name: 'BubbleMenu',
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
      if (!editor || editor.state.selection.empty) return null;

      const domSel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (!domSel || domSel.rangeCount === 0) return null;

      const range = domSel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;

      return h(
        'div',
        {
          class: props.class,
          style: {
            position: 'fixed',
            top: `${rect.top - offset}px`,
            left: `${rect.left + rect.width / 2}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 50,
          },
        },
        slots.default?.(),
      );
    };
  },
});
