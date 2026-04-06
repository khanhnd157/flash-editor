import { describe, it, expect } from 'vitest';
import { Editor, Extension, NodeExtension, MarkExtension } from '@flash/core';

describe('Extension system', () => {
  it('creates extension with name and priority', () => {
    const ext = Extension.create({ name: 'test', priority: 50 });
    expect(ext.name).toBe('test');
    expect(ext.priority).toBe(50);
  });

  it('default priority is 100', () => {
    const ext = Extension.create({ name: 'test' });
    expect(ext.priority).toBe(100);
  });

  it('configure() returns new instance with merged options', () => {
    const ext = Extension.create({
      name: 'test',
      addOptions: () => ({ color: 'red', size: 10 }),
    });
    const configured = ext.configure({ color: 'blue' });
    expect(configured.options.color).toBe('blue');
    expect(configured.options.size).toBe(10);
    // Original unchanged
    expect(ext.options.color).toBe('red');
  });

  it('NodeExtension provides nodeSpec', () => {
    const ext = NodeExtension.create({
      name: 'custom_block',
      nodeSpec: () => ({ content: 'inline*', group: 'block' }),
    });
    const spec = ext.getNodeSpec();
    expect(spec.content).toBe('inline*');
    expect(spec.group).toBe('block');
  });

  it('MarkExtension provides markSpec', () => {
    const ext = MarkExtension.create({
      name: 'custom_mark',
      markSpec: () => ({ attrs: { color: { default: 'red' } } }),
    });
    const spec = ext.getMarkSpec();
    expect(spec.attrs?.color.default).toBe('red');
  });
});

describe('Editor', () => {
  it('creates with default schema (doc, text, paragraph)', () => {
    const editor = new Editor();
    expect(editor.schema.nodes['doc']).toBeDefined();
    expect(editor.schema.nodes['text']).toBeDefined();
    expect(editor.schema.nodes['paragraph']).toBeDefined();
    editor.destroy();
  });

  it('builds schema from node extensions', () => {
    const heading = NodeExtension.create({
      name: 'heading',
      nodeSpec: () => ({
        content: 'inline*',
        group: 'block',
        attrs: { level: { default: 1 } },
      }),
    });

    const editor = new Editor({ extensions: [heading] });
    expect(editor.schema.nodes['heading']).toBeDefined();
    expect(editor.schema.nodes['heading'].spec.attrs?.level.default).toBe(1);
    editor.destroy();
  });

  it('builds schema from mark extensions', () => {
    const bold = MarkExtension.create({
      name: 'bold',
      markSpec: () => ({}),
    });

    const editor = new Editor({ extensions: [bold] });
    expect(editor.schema.marks['bold']).toBeDefined();
    editor.destroy();
  });

  it('collects commands from extensions', () => {
    const ext = Extension.create({
      name: 'test',
      addCommands: () => ({
        doSomething: () => (state, _dispatch) => true,
      }),
    });

    const editor = new Editor({ extensions: [ext] });
    expect(editor.getCommand('doSomething')).toBeDefined();
    expect(editor.command('doSomething')).toBe(true);
    editor.destroy();
  });

  it('can() checks command executability', () => {
    const ext = Extension.create({
      name: 'test',
      addCommands: () => ({
        alwaysTrue: () => (_state) => true,
        alwaysFalse: () => (_state) => false,
      }),
    });

    const editor = new Editor({ extensions: [ext] });
    expect(editor.can().command('alwaysTrue')).toBe(true);
    expect(editor.can().command('alwaysFalse')).toBe(false);
    editor.destroy();
  });

  it('sorts extensions by priority (higher first)', () => {
    const low = Extension.create({ name: 'low', priority: 10 });
    const high = Extension.create({ name: 'high', priority: 200 });
    const mid = Extension.create({ name: 'mid', priority: 100 });

    const editor = new Editor({ extensions: [low, high, mid] });
    expect(editor.extensions[0].name).toBe('high');
    expect(editor.extensions[1].name).toBe('mid');
    expect(editor.extensions[2].name).toBe('low');
    editor.destroy();
  });

  it('calls lifecycle hooks', () => {
    const events: string[] = [];

    const ext = Extension.create({
      name: 'lifecycle',
      onCreate: () => events.push('create'),
      onDestroy: () => events.push('destroy'),
    });

    const editor = new Editor({ extensions: [ext] });
    expect(events).toContain('create');

    editor.destroy();
    expect(events).toContain('destroy');
  });

  it('dispatches transaction and updates state', () => {
    const editor = new Editor();
    const oldDoc = editor.state.doc;

    // Insert text
    const tr = editor.state.tr;
    tr.insertText(1, 'hello');
    editor.dispatch(tr);

    expect(editor.state.doc).not.toBe(oldDoc);
    expect(editor.state.doc.textContent).toBe('hello');
    editor.destroy();
  });
});
