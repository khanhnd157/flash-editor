import { Editor } from '@flash/core';
import type { EditorConfig } from '@flash/core';

/**
 * Subscriber function type for Svelte stores.
 */
type Subscriber<T> = (value: T) => void;
type Unsubscriber = () => void;

/**
 * A Svelte-compatible readable store wrapping a Flash Editor instance.
 * Subscribe to get notified on every transaction.
 */
export interface EditorStore {
  subscribe: (run: Subscriber<Editor | null>) => Unsubscriber;
  destroy: () => void;
}

/**
 * Create a Svelte store that wraps a Flash Editor instance.
 * The store value is the Editor, updated on every transaction.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { createEditor, editorAction } from '@flash/svelte';
 *   const editor = createEditor({ extensions: [...] });
 * </script>
 *
 * <div use:editorAction={$editor}></div>
 * ```
 */
export function createEditor(config: EditorConfig = {}): EditorStore {
  const subscribers = new Set<Subscriber<Editor | null>>();
  let instance: Editor | null = null;

  function notify() {
    for (const sub of subscribers) {
      sub(instance);
    }
  }

  instance = new Editor({
    ...config,
    onTransaction: (props) => {
      config.onTransaction?.(props);
      notify();
    },
    onCreate: (editor) => {
      config.onCreate?.(editor);
    },
  });

  return {
    subscribe(run: Subscriber<Editor | null>): Unsubscriber {
      subscribers.add(run);
      run(instance);
      return () => {
        subscribers.delete(run);
      };
    },
    destroy() {
      instance?.destroy();
      instance = null;
      notify();
      subscribers.clear();
    },
  };
}
