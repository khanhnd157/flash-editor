import { describe, it, expect } from 'vitest';
import { Editor } from '@flash/core';

describe('@flash/vue exports', () => {
  it('exports all expected symbols', async () => {
    const mod = await import('./index');
    expect(mod.useEditor).toBeInstanceOf(Function);
    expect(mod.provideEditor).toBeInstanceOf(Function);
    expect(mod.useCurrentEditor).toBeInstanceOf(Function);
    expect(mod.EditorContent).toBeDefined();
    expect(mod.BubbleMenu).toBeDefined();
    expect(mod.FloatingMenu).toBeDefined();
    expect(mod.VueNodeViewRenderer).toBeInstanceOf(Function);
    expect(mod.EditorKey).toBeDefined();
  });
});

describe('VueNodeViewRenderer', () => {
  it('returns a CustomNodeView function', async () => {
    const { VueNodeViewRenderer } = await import('./VueNodeViewRenderer');
    const { defineComponent, h } = await import('vue');

    const DummyComponent = defineComponent({
      setup() {
        return () => h('div', 'test');
      },
    });

    const customView = VueNodeViewRenderer(DummyComponent);
    expect(customView).toBeInstanceOf(Function);
  });

  it('returns a VNode with data attribute', async () => {
    const { VueNodeViewRenderer } = await import('./VueNodeViewRenderer');
    const { DecorationSet } = await import('@flash/view');
    const { defineComponent, h: vueH } = await import('vue');

    const DummyComponent = defineComponent({
      setup() {
        return () => vueH('div', 'test');
      },
    });

    const customView = VueNodeViewRenderer(DummyComponent);

    const editor = new Editor();
    const node = editor.state.doc.child(0);

    const result = customView(node, DecorationSet.empty);
    expect(result).toBeDefined();
    expect(result.tag).toBe('div');
    expect(result.attrs?.['data-flash-vue-node-view']).toBeDefined();

    editor.destroy();
  });

  it('caches VNode by node identity', async () => {
    const { VueNodeViewRenderer } = await import('./VueNodeViewRenderer');
    const { DecorationSet } = await import('@flash/view');
    const { defineComponent, h: vueH } = await import('vue');

    const DummyComponent = defineComponent({
      setup() {
        return () => vueH('div', 'test');
      },
    });

    const customView = VueNodeViewRenderer(DummyComponent);

    const editor = new Editor();
    const node = editor.state.doc.child(0);

    const result1 = customView(node, DecorationSet.empty);
    const result2 = customView(node, DecorationSet.empty);
    expect(result1).toBe(result2);

    editor.destroy();
  });
});
