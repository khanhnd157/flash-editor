import { useEffect, useRef, useReducer } from 'react';
import { Editor } from '@flash/core';
import type { EditorConfig } from '@flash/core';

export interface UseEditorOptions extends EditorConfig {}

/**
 * React hook that creates and manages an Editor instance.
 * Re-renders the component on every editor transaction.
 *
 * @param config - Editor configuration
 * @param deps - Dependencies that trigger editor re-creation when changed
 */
export function useEditor(
  config: UseEditorOptions = {},
  deps: unknown[] = [],
): Editor | null {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    const instance = new Editor({
      ...config,
      onTransaction: (props) => {
        config.onTransaction?.(props);
        if (!instance.isDestroyed) {
          forceUpdate();
        }
      },
      onCreate: (editor) => {
        config.onCreate?.(editor);
        forceUpdate();
      },
    });

    editorRef.current = instance;
    forceUpdate();

    return () => {
      instance.destroy();
      editorRef.current = null;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return editorRef.current;
}
