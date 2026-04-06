import type { Editor } from '@flash/core';
import type { EditorState } from '@flash/state';

/**
 * Hook to derive a value from the editor state.
 * Re-computes the selector on every render (which happens on every transaction).
 * Combine with React.memo on child components for selective re-rendering.
 *
 * @param editor - Editor instance (from useEditor)
 * @param selector - Function that extracts a value from EditorState
 */
export function useEditorState<T>(
  editor: Editor | null,
  selector: (state: EditorState) => T,
): T | undefined {
  if (!editor) return undefined;
  return selector(editor.state);
}
