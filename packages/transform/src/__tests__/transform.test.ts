import { describe, it, expect } from 'vitest';
import { Schema, Fragment, Slice } from '@flash/model';
import { ReplaceStep } from '../step';
import { Transform } from '../transform';
import { Mapping } from '../map';

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

function makeDoc(schema: Schema, ...texts: string[]) {
  const paras = texts.map((t) =>
    schema.node('paragraph', null, t ? [schema.text(t)] : [])
  );
  return schema.node('doc', null, paras);
}

describe('ReplaceStep', () => {
  const schema = createTestSchema();

  it('inserts text via step', () => {
    const doc = makeDoc(schema, 'hello');
    // Insert " world" after "hello" (pos 6 = end of paragraph content)
    const insert = schema.text(' world');
    const slice = new Slice(Fragment.from([insert]), 0, 0);
    const step = new ReplaceStep(6, 6, slice);
    const result = step.apply(doc);
    expect(result.failed).toBeNull();
    expect(result.doc!.child(0).textContent).toBe('hello world');
  });

  it('deletes text via step', () => {
    const doc = makeDoc(schema, 'hello');
    const step = new ReplaceStep(1, 4, Slice.empty); // delete "hel"
    const result = step.apply(doc);
    expect(result.failed).toBeNull();
    expect(result.doc!.child(0).textContent).toBe('lo');
  });

  it('invert recovers original doc', () => {
    const doc = makeDoc(schema, 'hello');
    const step = new ReplaceStep(1, 4, Slice.empty);
    const result = step.apply(doc);
    const inverse = step.invert(doc);
    const recovered = inverse.apply(result.doc!);
    expect(recovered.doc!.child(0).textContent).toBe('hello');
  });

  it('maps through another step', () => {
    const step = new ReplaceStep(5, 5, new Slice(Fragment.from([schema.text('X')]), 0, 0));
    const mapping = new Mapping();
    mapping.appendMap(new ReplaceStep(1, 1, new Slice(Fragment.from([schema.text('YY')]), 0, 0)).getMap());
    const mapped = step.map(mapping);
    expect(mapped).not.toBeNull();
    expect((mapped as ReplaceStep).from).toBe(7); // shifted by 2
  });

  it('getMap returns correct ranges', () => {
    const step = new ReplaceStep(5, 8, new Slice(Fragment.from([schema.text('X')]), 0, 0));
    const map = step.getMap();
    expect(map.ranges).toEqual([5, 3, 1]); // replace 3 chars with 1
  });

  it('toJSON serializes', () => {
    const step = new ReplaceStep(5, 8, Slice.empty);
    const json = step.toJSON();
    expect(json.stepType).toBe('replace');
    expect(json.from).toBe(5);
    expect(json.to).toBe(8);
  });
});

describe('Transform', () => {
  const schema = createTestSchema();

  it('tracks doc changes', () => {
    const doc = makeDoc(schema, 'hello');
    const tr = new Transform(doc);
    expect(tr.docChanged).toBe(false);
    tr.insertText(6, ' world');
    expect(tr.docChanged).toBe(true);
    expect(tr.doc.child(0).textContent).toBe('hello world');
  });

  it('delete() removes content', () => {
    const doc = makeDoc(schema, 'hello');
    const tr = new Transform(doc);
    tr.delete(1, 4); // delete "hel"
    expect(tr.doc.child(0).textContent).toBe('lo');
  });

  it('preserves original doc in before', () => {
    const doc = makeDoc(schema, 'hello');
    const tr = new Transform(doc);
    tr.delete(1, 4);
    expect(tr.before.child(0).textContent).toBe('hello');
  });

  it('multiple steps compose', () => {
    const doc = makeDoc(schema, 'abc');
    const tr = new Transform(doc);
    tr.insertText(4, 'X'); // "abcX"
    tr.insertText(5, 'Y'); // "abcXY"
    expect(tr.doc.child(0).textContent).toBe('abcXY');
    expect(tr.steps.length).toBe(2);
  });

  it('mapping tracks positions through steps', () => {
    const doc = makeDoc(schema, 'abc');
    const tr = new Transform(doc);
    tr.insertText(2, 'XX'); // insert "XX" after "a"
    expect(tr.mapping.map(1)).toBe(1); // before insert: unchanged
    expect(tr.mapping.map(4)).toBe(6); // after insert: shifted by 2
  });
});
