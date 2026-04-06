import {
  defineComponent,
  h,
  ref,
  watch,
  onBeforeUnmount,
  type PropType,
  type ShallowRef,
  Teleport,
} from 'vue';
import type { Editor } from '@flash/core';
import { EditorView } from '@flash/view';
import { vueNodeViewRegistry, type VueNodeViewEntry } from './VueNodeViewRenderer';

export const EditorContent = defineComponent({
  name: 'EditorContent',
  props: {
    editor: {
      type: Object as PropType<Editor | null>,
      default: null,
    },
    class: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const containerRef = ref<HTMLElement | null>(null);
    let view: EditorView | null = null;

    function syncPortals(): VueNodeViewEntry[] {
      if (!containerRef.value) return [];
      const entries: VueNodeViewEntry[] = [];
      containerRef.value.querySelectorAll('[data-flash-vue-node-view]').forEach((el) => {
        const id = el.getAttribute('data-flash-vue-node-view');
        if (id && vueNodeViewRegistry.has(id)) {
          entries.push(vueNodeViewRegistry.get(id)!);
        }
      });
      return entries;
    }

    function createView(editor: Editor) {
      if (!containerRef.value) return;
      view = new EditorView(containerRef.value, {
        state: editor.state,
        dispatchTransaction: (tr) => {
          editor.dispatch(tr);
          view!.updateState(editor.state);
        },
      });
    }

    watch(
      () => props.editor,
      (editor, _old, onCleanup) => {
        if (editor && containerRef.value) {
          createView(editor);
        }
        onCleanup(() => {
          view?.destroy();
          view = null;
        });
      },
    );

    // Sync state to view when editor state changes
    watch(
      () => props.editor?.state,
      () => {
        if (view && props.editor) {
          view.updateState(props.editor.state);
        }
      },
    );

    onBeforeUnmount(() => {
      view?.destroy();
      view = null;
    });

    return () => {
      const portalEntries = syncPortals();
      const children = portalEntries.map((entry) => {
        const target = containerRef.value?.querySelector(
          `[data-flash-vue-node-view="${entry.id}"]`,
        );
        if (!target) return null;
        return h(Teleport, { to: target }, [
          h(entry.Component, { node: entry.node, decorations: entry.decorations }),
        ]);
      });

      return h('div', null, [
        h('div', { ref: containerRef, class: props.class }),
        ...children.filter(Boolean),
      ]);
    };
  },
});
