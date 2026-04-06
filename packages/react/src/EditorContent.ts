import { createElement, useRef, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@flash/core';
import { EditorView } from '@flash/view';
import { nodeViewRegistry, type NodeViewEntry } from './ReactNodeViewRenderer';

export interface EditorContentProps {
  editor: Editor | null;
  className?: string;
}

export function EditorContent({ editor, className }: EditorContentProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [portals, setPortals] = useState<Array<{ id: string; entry: NodeViewEntry; element: Element }>>([]);

  // Create/destroy EditorView when editor changes
  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const view = new EditorView(containerRef.current, {
      state: editor.state,
      dispatchTransaction: (tr) => {
        editor.dispatch(tr);
        view.updateState(editor.state);
        syncPortals();
      },
    });

    viewRef.current = view;
    syncPortals();

    return () => {
      view.destroy();
      viewRef.current = null;
      setPortals([]);
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync editor state to view on re-renders
  useEffect(() => {
    if (viewRef.current && editor) {
      viewRef.current.updateState(editor.state);
      syncPortals();
    }
  });

  function syncPortals() {
    if (!containerRef.current) return;
    const elements = containerRef.current.querySelectorAll('[data-flash-react-node-view]');
    const newPortals: typeof portals = [];
    elements.forEach((el) => {
      const id = el.getAttribute('data-flash-react-node-view');
      if (id && nodeViewRegistry.has(id)) {
        newPortals.push({ id, entry: nodeViewRegistry.get(id)!, element: el });
      }
    });
    setPortals(newPortals);
  }

  const children: ReactNode[] = [
    createElement('div', { key: 'editor-container', ref: containerRef, className }),
  ];

  for (const { id, entry, element } of portals) {
    children.push(
      createPortal(
        createElement(entry.Component, { node: entry.node, decorations: entry.decorations }),
        element,
        id,
      ),
    );
  }

  return createElement('div', null, ...children);
}
