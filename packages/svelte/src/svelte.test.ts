import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditor } from './createEditor';
import { editorAction } from './editorAction';

describe('createEditor', () => {
  it('creates a store with subscribe method', () => {
    const store = createEditor();
    expect(store.subscribe).toBeInstanceOf(Function);
    expect(store.destroy).toBeInstanceOf(Function);
    store.destroy();
  });

  it('emits editor instance to subscribers', () => {
    const store = createEditor();
    const subscriber = vi.fn();

    store.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);

    const editor = subscriber.mock.calls[0][0];
    expect(editor).not.toBeNull();
    expect(editor.isDestroyed).toBe(false);

    store.destroy();
  });

  it('notifies subscribers on transactions', () => {
    const store = createEditor();
    const subscriber = vi.fn();

    store.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);

    const editor = subscriber.mock.calls[0][0]!;

    // Dispatch a transaction
    const tr = editor.state.tr;
    editor.dispatch(tr);

    // Should have been called again
    expect(subscriber).toHaveBeenCalledTimes(2);

    store.destroy();
  });

  it('emits null after destroy', () => {
    const store = createEditor();
    const values: unknown[] = [];

    store.subscribe((v) => values.push(v));
    expect(values.length).toBe(1);
    expect(values[0]).not.toBeNull();

    store.destroy();
    expect(values.length).toBe(2);
    expect(values[1]).toBeNull();
  });

  it('unsubscribe stops notifications', () => {
    const store = createEditor();
    const subscriber = vi.fn();

    const unsubscribe = store.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();

    const editor = subscriber.mock.calls[0][0]!;
    const tr = editor.state.tr;
    editor.dispatch(tr);

    // Should NOT have been called again
    expect(subscriber).toHaveBeenCalledTimes(1);

    store.destroy();
  });

  it('passes config to editor', () => {
    const onCreate = vi.fn();
    const store = createEditor({ onCreate });

    expect(onCreate).toHaveBeenCalledTimes(1);

    store.destroy();
  });
});

describe('editorAction', () => {
  it('mounts editor view on element', () => {
    const store = createEditor();
    let editor: any = null;
    store.subscribe((e) => { editor = e; });

    const node = document.createElement('div');
    const action = editorAction(node, editor);

    // EditorView appends a .flash-editor div
    expect(node.querySelector('.flash-editor')).not.toBeNull();

    action.destroy();
    store.destroy();
  });

  it('handles null editor gracefully', () => {
    const node = document.createElement('div');
    const action = editorAction(node, null);

    expect(node.querySelector('.flash-editor')).toBeNull();

    action.destroy();
  });

  it('update replaces view when editor changes', () => {
    const store1 = createEditor();
    const store2 = createEditor();
    let editor1: any = null;
    let editor2: any = null;
    store1.subscribe((e) => { editor1 = e; });
    store2.subscribe((e) => { editor2 = e; });

    const node = document.createElement('div');
    const action = editorAction(node, editor1);

    expect(node.querySelector('.flash-editor')).not.toBeNull();

    // Update to new editor
    action.update(editor2);
    expect(node.querySelector('.flash-editor')).not.toBeNull();

    // Update to null
    action.update(null);
    // View destroyed, DOM cleaned
    expect(node.querySelector('.flash-editor')).toBeNull();

    action.destroy();
    store1.destroy();
    store2.destroy();
  });

  it('destroy cleans up view', () => {
    const store = createEditor();
    let editor: any = null;
    store.subscribe((e) => { editor = e; });

    const node = document.createElement('div');
    const action = editorAction(node, editor);

    action.destroy();
    expect(node.querySelector('.flash-editor')).toBeNull();

    store.destroy();
  });
});
