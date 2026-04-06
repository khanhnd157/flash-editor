import { describe, it, expect, beforeEach } from 'vitest';
import { Schema, Fragment } from '@flash/model';
import type { SchemaSpec, Node as DocNode } from '@flash/model';
import { EditorState, TextSelection, AllSelection } from '@flash/state';
import {
  selectAll,
  deleteSelection,
  toggleMark,
  setBlockType,
  splitBlock,
  insertText,
  isMarkActive,
  isBlockActive,
} from '../index';

function createTestSchema(): Schema {
  const spec: SchemaSpec = {
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      heading: { content: 'inline*', group: 'block', attrs: { level: { default: 1 } } },
      blockquote: { content: 'block+', group: 'block' },
      text: { group: 'inline' },
      hard_break: { inline: true, group: 'inline' },
    },
    marks: {
      bold: {},
      italic: {},
      link: { attrs: { href: { default: '' } } },
    },
  };
  return new Schema(spec);
}

function makeDoc(schema: Schema, ...texts: string[]): DocNode {
  return schema.node('doc', null,
    texts.map((t) => schema.node('paragraph', null, t ? [schema.text(t)] : [])),
  );
}

function createState(schema: Schema, doc: DocNode, anchor: number, head?: number): EditorState {
  const state = EditorState.create({ doc });
  const tr = state.tr.setSelection(TextSelection.create(doc, anchor, head));
  return state.apply(tr);
}

// ---- Tests ----

describe('selectAll', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('selects entire document', () => {
    const doc = makeDoc(schema, 'hello', 'world');
    const state = createState(schema, doc, 2);
    let dispatched: EditorState | null = null;

    selectAll(state, (tr) => { dispatched = state.apply(tr); });

    expect(dispatched).not.toBeNull();
    expect(dispatched!.selection).toBeInstanceOf(AllSelection);
  });

  it('always returns true', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 2);
    expect(selectAll(state)).toBe(true);
  });
});

describe('deleteSelection', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('returns false for cursor selection', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 2);
    expect(deleteSelection(state)).toBe(false);
  });

  it('deletes range selection', () => {
    const doc = makeDoc(schema, 'hello');
    // Select "ell" (positions 2-5 in first paragraph)
    const state = createState(schema, doc, 2, 5);
    let newState: EditorState | null = null;

    deleteSelection(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    expect(newState!.doc.textContent).toBe('ho');
  });
});

describe('toggleMark', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('can check: returns true for valid range', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 2, 5);
    const boldType = schema.marks['bold'];
    expect(toggleMark(boldType)(state)).toBe(true);
  });

  it('adds mark to unmarked range', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 2, 5);
    const boldType = schema.marks['bold'];
    let newState: EditorState | null = null;

    toggleMark(boldType)(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    expect(newState!.doc.rangeHasMark(2, 5, boldType)).toBe(true);
  });

  it('removes mark from marked range', () => {
    const boldMark = schema.mark('bold');
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello', [boldMark])]),
    ]);
    const state = createState(schema, doc, 2, 5);
    const boldType = schema.marks['bold'];
    let newState: EditorState | null = null;

    toggleMark(boldType)(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    expect(newState!.doc.rangeHasMark(2, 5, boldType)).toBe(false);
  });

  it('toggles stored marks for cursor selection', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 3);
    const boldType = schema.marks['bold'];
    let newState: EditorState | null = null;

    toggleMark(boldType)(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    // storedMarks should include bold
    expect(newState!.storedMarks?.some((m) => m.type === boldType)).toBe(true);
  });
});

describe('setBlockType', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('changes paragraph to heading', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 3);
    const headingType = schema.nodes['heading'];
    let newState: EditorState | null = null;

    setBlockType(headingType, { level: 2 })(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    expect(newState!.doc.child(0).type.name).toBe('heading');
    expect(newState!.doc.child(0).attrs.level).toBe(2);
  });

  it('returns false when already the target type', () => {
    const doc = schema.node('doc', null, [
      schema.node('heading', { level: 1 }, [schema.text('title')]),
    ]);
    const state = createState(schema, doc, 3);
    const headingType = schema.nodes['heading'];
    expect(setBlockType(headingType)(state)).toBe(false);
  });
});

describe('isMarkActive', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('returns false for unmarked text', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 2, 5);
    expect(isMarkActive(state, schema.marks['bold'])).toBe(false);
  });

  it('returns true for marked text', () => {
    const boldMark = schema.mark('bold');
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello', [boldMark])]),
    ]);
    const state = createState(schema, doc, 2, 5);
    expect(isMarkActive(state, schema.marks['bold'])).toBe(true);
  });
});

describe('isBlockActive', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('detects paragraph', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 3);
    expect(isBlockActive(state, schema.nodes['paragraph'])).toBe(true);
    expect(isBlockActive(state, schema.nodes['heading'])).toBe(false);
  });

  it('detects heading with attrs', () => {
    const doc = schema.node('doc', null, [
      schema.node('heading', { level: 2 }, [schema.text('title')]),
    ]);
    const state = createState(schema, doc, 3);
    expect(isBlockActive(state, schema.nodes['heading'], { level: 2 })).toBe(true);
    expect(isBlockActive(state, schema.nodes['heading'], { level: 1 })).toBe(false);
  });
});

describe('insertText', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('inserts text at cursor', () => {
    const doc = makeDoc(schema, 'hello');
    const state = createState(schema, doc, 3);
    let newState: EditorState | null = null;

    insertText('XY')(state, (tr) => { newState = state.apply(tr); });

    expect(newState).not.toBeNull();
    expect(newState!.doc.textContent).toBe('heXYllo');
  });
});
