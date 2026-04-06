import {
  shallowRef,
  onMounted,
  onBeforeUnmount,
  triggerRef,
  provide,
  inject,
  type ShallowRef,
  type InjectionKey,
} from 'vue';
import { Editor } from '@flash/core';
import type { EditorConfig } from '@flash/core';

export const EditorKey: InjectionKey<ShallowRef<Editor | null>> = Symbol('flash-editor');

/**
 * Vue 3 composable that creates and manages an Editor instance.
 * Returns a shallowRef — triggers reactivity on every transaction.
 *
 * @param config - Editor configuration
 */
export function useEditor(config: EditorConfig = {}): ShallowRef<Editor | null> {
  const editor = shallowRef<Editor | null>(null);

  onMounted(() => {
    const instance = new Editor({
      ...config,
      onTransaction: (props) => {
        config.onTransaction?.(props);
        triggerRef(editor);
      },
      onCreate: (e) => {
        config.onCreate?.(e);
      },
    });

    editor.value = instance;
  });

  onBeforeUnmount(() => {
    editor.value?.destroy();
    editor.value = null;
  });

  return editor;
}

/**
 * Provide the editor instance to child components.
 */
export function provideEditor(editor: ShallowRef<Editor | null>): void {
  provide(EditorKey, editor);
}

/**
 * Inject the editor instance from a parent component.
 */
export function useCurrentEditor(): ShallowRef<Editor | null> {
  const editor = inject(EditorKey);
  if (!editor) {
    throw new Error('[flash/vue] useCurrentEditor must be used inside a component that provides EditorKey');
  }
  return editor;
}
