import { describe, it, expect } from 'vitest';
import { Schema } from '@flash/model';
import { EditorState, TextSelection, NodeSelection, AllSelection, Plugin, PluginKey } from '../index';

function createTestSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
    },
    marks: {
      bold: {},
    },
  });
}

describe('EditorState', () => {
  const schema = createTestSchema();

  it('creates from schema', () => {
    const state = EditorState.create({ schema });
    expect(state.doc).toBeDefined();
    expect(state.doc.type.name).toBe('doc');
    expect(state.selection).toBeInstanceOf(TextSelection);
  });

  it('creates from doc', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const state = EditorState.create({ doc });
    expect(state.doc.child(0).textContent).toBe('hello');
  });

  it('applies transaction', () => {
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('hello')]),
      ]),
    });

    const tr = state.tr;
    tr.insertText(6, ' world');
    const newState = state.apply(tr);
    expect(newState.doc.child(0).textContent).toBe('hello world');
    // Original state unchanged
    expect(state.doc.child(0).textContent).toBe('hello');
  });

  it('toJSON serializes', () => {
    const state = EditorState.create({ schema });
    const json = state.toJSON();
    expect(json.doc).toBeDefined();
    expect(json.selection).toBeDefined();
  });
});

describe('TextSelection', () => {
  const schema = createTestSchema();

  it('creates cursor selection', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const sel = TextSelection.create(doc, 3);
    expect(sel.anchor).toBe(3);
    expect(sel.head).toBe(3);
    expect(sel.empty).toBe(true);
    expect(sel.$cursor).not.toBeNull();
  });

  it('creates range selection', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const sel = TextSelection.create(doc, 1, 6);
    expect(sel.from).toBe(1);
    expect(sel.to).toBe(6);
    expect(sel.empty).toBe(false);
    expect(sel.$cursor).toBeNull();
  });

  it('atStart()', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const sel = TextSelection.atStart(doc);
    expect(sel.anchor).toBe(0);
  });

  it('atEnd()', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const sel = TextSelection.atEnd(doc);
    expect(sel.anchor).toBe(doc.content.size);
  });
});

describe('AllSelection', () => {
  const schema = createTestSchema();

  it('selects entire document', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const sel = new AllSelection(doc);
    expect(sel.from).toBe(0);
    expect(sel.to).toBe(doc.content.size);
  });
});

describe('Plugin', () => {
  const schema = createTestSchema();

  it('tracks state through transactions', () => {
    const counterKey = new PluginKey<number>('counter');
    const counterPlugin = new Plugin<number>({
      key: counterKey,
      state: {
        init: () => 0,
        apply: (_tr, value) => value + 1,
      },
    });

    const state = EditorState.create({
      schema,
      plugins: [counterPlugin],
    });

    expect(counterKey.get(state)).toBe(0);

    const tr = state.tr.insertText(1, 'x');
    const newState = state.apply(tr);
    expect(counterKey.get(newState)).toBe(1);
  });

  it('filterTransaction can reject transactions', () => {
    const readonlyPlugin = new Plugin({
      filterTransaction: () => false,
    });

    const state = EditorState.create({
      schema,
      plugins: [readonlyPlugin],
    });

    const tr = state.tr.insertText(1, 'x');
    const { state: newState, transactions } = state.applyTransaction(tr);
    expect(newState).toBe(state); // same state, transaction rejected
    expect(transactions.length).toBe(0);
  });
});
