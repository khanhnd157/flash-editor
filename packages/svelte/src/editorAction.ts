import type { Editor } from '@flash/core';
import { EditorView } from '@flash/view';

/**
 * Svelte action that mounts an EditorView onto a DOM element.
 *
 * Usage:
 * ```svelte
 * <div use:editorAction={$editor}></div>
 * ```
 */
export function editorAction(node: HTMLElement, editor: Editor | null) {
  let view: EditorView | null = null;

  function mount(ed: Editor) {
    view = new EditorView(node, {
      state: ed.state,
      dispatchTransaction: (tr) => {
        ed.dispatch(tr);
        view!.updateState(ed.state);
      },
    });
  }

  if (editor) {
    mount(editor);
  }

  return {
    update(newEditor: Editor | null) {
      if (view) {
        view.destroy();
        view = null;
      }
      if (newEditor) {
        mount(newEditor);
      }
    },
    destroy() {
      if (view) {
        view.destroy();
        view = null;
      }
    },
  };
}
