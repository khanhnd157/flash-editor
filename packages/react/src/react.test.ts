import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@flash/core';
import type { EditorConfig } from '@flash/core';

describe('@flash/react exports', () => {
  it('exports all expected symbols', async () => {
    const mod = await import('./index');
    expect(mod.useEditor).toBeInstanceOf(Function);
    expect(mod.useEditorState).toBeInstanceOf(Function);
    expect(mod.EditorContent).toBeInstanceOf(Function);
    expect(mod.BubbleMenu).toBeInstanceOf(Function);
    expect(mod.FloatingMenu).toBeInstanceOf(Function);
    expect(mod.ReactNodeViewRenderer).toBeInstanceOf(Function);
    expect(mod.EditorContext).toBeDefined();
    expect(mod.useCurrentEditor).toBeInstanceOf(Function);
  });
});

describe('ReactNodeViewRenderer', () => {
  it('returns a CustomNodeView function', async () => {
    const { ReactNodeViewRenderer } = await import('./ReactNodeViewRenderer');

    const DummyComponent = () => null;
    const customView = ReactNodeViewRenderer(DummyComponent);
    expect(customView).toBeInstanceOf(Function);
  });

  it('returns a VNode with data attribute', async () => {
    const { ReactNodeViewRenderer } = await import('./ReactNodeViewRenderer');
    const { DecorationSet } = await import('@flash/view');

    const DummyComponent = () => null;
    const customView = ReactNodeViewRenderer(DummyComponent);

    // Create a minimal node for testing
    const editor = new Editor();
    const node = editor.state.doc.child(0);

    const result = customView(node, DecorationSet.empty);
    expect(result).toBeDefined();
    expect(result.tag).toBe('div');
    expect(result.attrs?.['data-flash-react-node-view']).toBeDefined();
    expect(result.attrs?.contenteditable).toBe('false');

    editor.destroy();
  });

  it('caches VNode by node identity', async () => {
    const { ReactNodeViewRenderer } = await import('./ReactNodeViewRenderer');
    const { DecorationSet } = await import('@flash/view');

    const DummyComponent = () => null;
    const customView = ReactNodeViewRenderer(DummyComponent);

    const editor = new Editor();
    const node = editor.state.doc.child(0);

    const result1 = customView(node, DecorationSet.empty);
    const result2 = customView(node, DecorationSet.empty);

    // Same node reference → same VNode reference
    expect(result1).toBe(result2);

    editor.destroy();
  });
});

describe('useEditorState', () => {
  it('returns undefined when editor is null', async () => {
    const { useEditorState } = await import('./useEditorState');
    const result = useEditorState(null, (state) => state.doc.textContent);
    expect(result).toBeUndefined();
  });

  it('applies selector to editor state', async () => {
    const { useEditorState } = await import('./useEditorState');

    const editor = new Editor();
    const result = useEditorState(editor, (state) => state.doc.childCount);
    expect(result).toBe(1); // Default doc has one paragraph

    editor.destroy();
  });
});
