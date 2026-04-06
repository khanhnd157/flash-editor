import { describe, it, expect, beforeEach } from 'vitest';
import { Schema, Node, Fragment, Mark, TextNode, Slice, ResolvedPos, ContentMatch } from '../index';
import type { SchemaSpec } from '../index';

// Shared test schema
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

describe('Schema', () => {
  it('creates node types from spec', () => {
    const schema = createTestSchema();
    expect(schema.nodes['doc']).toBeDefined();
    expect(schema.nodes['paragraph']).toBeDefined();
    expect(schema.nodes['text']).toBeDefined();
    expect(schema.topNodeType.name).toBe('doc');
  });

  it('creates mark types from spec', () => {
    const schema = createTestSchema();
    expect(schema.marks['bold']).toBeDefined();
    expect(schema.marks['italic']).toBeDefined();
    expect(schema.marks['link']).toBeDefined();
  });

  it('nodeType() throws for unknown type', () => {
    const schema = createTestSchema();
    expect(() => schema.nodeType('unknown')).toThrow('Unknown node type: unknown');
  });

  it('creates text nodes', () => {
    const schema = createTestSchema();
    const text = schema.text('hello');
    expect(text.text).toBe('hello');
    expect(text.isText).toBe(true);
    expect(text.nodeSize).toBe(5);
  });

  it('creates nodes with content', () => {
    const schema = createTestSchema();
    const text = schema.text('hello');
    const para = schema.node('paragraph', null, [text]);
    expect(para.childCount).toBe(1);
    expect(para.textContent).toBe('hello');
    expect(para.nodeSize).toBe(7); // 2 (open+close) + 5 (text)
  });

  it('creates marks with attrs', () => {
    const schema = createTestSchema();
    const link = schema.mark('link', { href: 'https://example.com' });
    expect(link.attrs.href).toBe('https://example.com');
  });
});

describe('Mark', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('eq compares type and attrs', () => {
    const b1 = schema.mark('bold');
    const b2 = schema.mark('bold');
    const i1 = schema.mark('italic');
    expect(b1.eq(b2)).toBe(true);
    expect(b1.eq(i1)).toBe(false);
  });

  it('addToSet inserts in rank order', () => {
    const bold = schema.mark('bold');
    const italic = schema.mark('italic');
    const set = bold.addToSet(Mark.none);
    expect(set.length).toBe(1);
    const set2 = italic.addToSet(set);
    expect(set2.length).toBe(2);
    // Bold should come first (lower rank)
    expect(set2[0].type.name).toBe('bold');
    expect(set2[1].type.name).toBe('italic');
  });

  it('addToSet replaces same type', () => {
    const link1 = schema.mark('link', { href: 'a.com' });
    const link2 = schema.mark('link', { href: 'b.com' });
    const set = link1.addToSet(Mark.none);
    const set2 = link2.addToSet(set);
    expect(set2.length).toBe(1);
    expect(set2[0].attrs.href).toBe('b.com');
  });

  it('removeFromSet removes matching mark', () => {
    const bold = schema.mark('bold');
    const italic = schema.mark('italic');
    const set = italic.addToSet(bold.addToSet(Mark.none));
    expect(set.length).toBe(2);
    const set2 = bold.removeFromSet(set);
    expect(set2.length).toBe(1);
    expect(set2[0].type.name).toBe('italic');
  });

  it('sameSet compares mark arrays', () => {
    const bold = schema.mark('bold');
    const italic = schema.mark('italic');
    const a = italic.addToSet(bold.addToSet(Mark.none));
    const b = italic.addToSet(bold.addToSet(Mark.none));
    expect(Mark.sameSet(a, b)).toBe(true);
    expect(Mark.sameSet(a, Mark.none)).toBe(false);
  });
});

describe('Fragment', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('from() creates fragment from array', () => {
    const t = schema.text('hello');
    const frag = Fragment.from([t]);
    expect(frag.childCount).toBe(1);
    expect(frag.size).toBe(5);
  });

  it('empty fragment', () => {
    expect(Fragment.empty.childCount).toBe(0);
    expect(Fragment.empty.size).toBe(0);
  });

  it('child() access', () => {
    const t1 = schema.text('hello');
    const t2 = schema.text('world');
    const frag = Fragment.from([t1, t2]);
    expect(frag.child(0).text).toBe('hello');
    expect(frag.child(1).text).toBe('world');
  });

  it('child() throws on out of range', () => {
    expect(() => Fragment.empty.child(0)).toThrow();
  });

  it('findIndex() handles positions', () => {
    const t1 = schema.text('ab');
    const t2 = schema.text('cd');
    const frag = Fragment.from([t1, t2]);
    expect(frag.findIndex(0)).toEqual({ index: 0, offset: 0 });
    expect(frag.findIndex(1)).toEqual({ index: 0, offset: 0 });
    expect(frag.findIndex(2)).toEqual({ index: 1, offset: 2 });
    expect(frag.findIndex(4)).toEqual({ index: 2, offset: 4 });
  });

  it('cut() slices fragment', () => {
    const t = schema.text('hello');
    const frag = Fragment.from([t]);
    const cut = frag.cut(1, 4);
    expect(cut.child(0).text).toBe('ell');
  });

  it('append() merges adjacent text with same marks', () => {
    const t1 = schema.text('he');
    const t2 = schema.text('llo');
    const f1 = Fragment.from([t1]);
    const f2 = Fragment.from([t2]);
    const merged = f1.append(f2);
    expect(merged.childCount).toBe(1);
    expect(merged.child(0).text).toBe('hello');
  });

  it('forEach() iterates with offset', () => {
    const t1 = schema.text('ab');
    const t2 = schema.text('cd');
    const frag = Fragment.from([t1, t2]);
    const offsets: number[] = [];
    frag.forEach((_n, off) => offsets.push(off));
    expect(offsets).toEqual([0, 2]);
  });

  it('eq() compares fragments', () => {
    const t = schema.text('hello');
    const f1 = Fragment.from([t]);
    const f2 = Fragment.from([t]);
    expect(f1.eq(f2)).toBe(true);
    expect(f1.eq(Fragment.empty)).toBe(false);
  });
});

describe('Node', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('creates paragraph with text', () => {
    const para = schema.node('paragraph', null, [schema.text('hello')]);
    expect(para.type.name).toBe('paragraph');
    expect(para.textContent).toBe('hello');
    expect(para.isBlock).toBe(true);
    expect(para.isInline).toBe(false);
  });

  it('creates document with paragraphs', () => {
    const p1 = schema.node('paragraph', null, [schema.text('first')]);
    const p2 = schema.node('paragraph', null, [schema.text('second')]);
    const doc = schema.node('doc', null, [p1, p2]);
    expect(doc.childCount).toBe(2);
    expect(doc.child(0).textContent).toBe('first');
    expect(doc.child(1).textContent).toBe('second');
  });

  it('text node properties', () => {
    const text = schema.text('hello');
    expect(text.isText).toBe(true);
    expect(text.isInline).toBe(true);
    expect(text.isBlock).toBe(false);
    expect(text.nodeSize).toBe(5);
    expect(text.text).toBe('hello');
  });

  it('mark() creates new node with marks', () => {
    const text = schema.text('bold');
    const boldMark = schema.mark('bold');
    const marked = text.mark([boldMark]);
    expect(marked.marks.length).toBe(1);
    expect(marked.marks[0].type.name).toBe('bold');
    expect(marked.text).toBe('bold');
  });

  it('nodeSize for blocks includes open/close tokens', () => {
    const para = schema.node('paragraph', null, [schema.text('hi')]);
    // nodeSize = 2 (open+close) + 2 (text length)
    expect(para.nodeSize).toBe(4);
  });

  it('sameMarkup compares type, attrs, marks', () => {
    const p1 = schema.node('paragraph');
    const p2 = schema.node('paragraph');
    const h1 = schema.node('heading', { level: 1 });
    expect(p1.sameMarkup(p2)).toBe(true);
    expect(p1.sameMarkup(h1)).toBe(false);
  });

  it('copy() creates node with new content', () => {
    const para = schema.node('paragraph', null, [schema.text('hello')]);
    const copy = para.copy(Fragment.from([schema.text('world')]));
    expect(copy.textContent).toBe('world');
    expect(copy.type).toBe(para.type);
  });

  it('cut() slices content', () => {
    const text = schema.text('hello world');
    const cut = text.cut(0, 5);
    expect(cut.text).toBe('hello');
  });

  it('toJSON()', () => {
    const bold = schema.mark('bold');
    const text = schema.text('hi', [bold]);
    const para = schema.node('paragraph', null, [text]);
    const json = para.toJSON();
    expect(json.type).toBe('paragraph');
    expect((json.content as unknown[])[0]).toHaveProperty('text', 'hi');
  });

  it('eq()', () => {
    const p1 = schema.node('paragraph', null, [schema.text('Same')]);
    const p2 = schema.node('paragraph', null, [schema.text('Same')]);
    const p3 = schema.node('paragraph', null, [schema.text('Different')]);
    expect(p1.eq(p2)).toBe(true);
    expect(p1.eq(p3)).toBe(false);
  });
});

describe('TextNode', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('rejects empty text', () => {
    expect(() => new TextNode(schema.nodes['text'], {}, '', Mark.none)).toThrow();
  });

  it('withText()', () => {
    const t = schema.text('old');
    const t2 = t.withText('new');
    expect(t2.text).toBe('new');
    expect(t.text).toBe('old'); // immutable
  });
});

describe('ResolvedPos', () => {
  let schema: Schema;
  let doc: Node;

  beforeEach(() => {
    schema = createTestSchema();
    // doc: <doc><p>hello</p><p>world</p></doc>
    // Positions: 0 <doc> 1 <p> 2 h 3 e 4 l 5 l 6 o 7 </p> 8 <p> 9 w 10 o 11 r 12 l 13 d 14 </p> 15 </doc>
    //                             ^--- pos=1 is start of first paragraph content
    doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
      schema.node('paragraph', null, [schema.text('world')]),
    ]);
  });

  it('resolves position at start', () => {
    const $pos = doc.resolve(0);
    expect($pos.depth).toBe(0);
    expect($pos.parent.type.name).toBe('doc');
  });

  it('resolves position inside first paragraph', () => {
    const $pos = doc.resolve(3); // inside "hello"
    expect($pos.depth).toBe(1);
    expect($pos.parent.type.name).toBe('paragraph');
  });

  it('start() and end()', () => {
    const $pos = doc.resolve(3);
    expect($pos.start(1)).toBe(1);
    expect($pos.end(1)).toBe(6);
  });

  it('node() at depth', () => {
    const $pos = doc.resolve(3);
    expect($pos.node(0).type.name).toBe('doc');
    expect($pos.node(1).type.name).toBe('paragraph');
  });

  it('sharedDepth', () => {
    const $pos = doc.resolve(3);
    expect($pos.sharedDepth(10)).toBe(0); // different paragraphs
    expect($pos.sharedDepth(5)).toBe(1); // same paragraph
  });

  it('throws on out of range', () => {
    expect(() => doc.resolve(-1)).toThrow();
    expect(() => doc.resolve(100)).toThrow();
  });
});

describe('ContentMatch', () => {
  let schema: Schema;
  beforeEach(() => { schema = createTestSchema(); });

  it('validates block+ content', () => {
    const match = schema.nodes['doc'].contentMatch;
    const para = schema.nodes['paragraph'];
    const next = match.matchType(para);
    expect(next).not.toBeNull();
    expect(next!.validEnd).toBe(true); // one block is enough for block+
  });

  it('validates inline* content', () => {
    const match = schema.nodes['paragraph'].contentMatch;
    expect(match.validEnd).toBe(true); // inline* allows empty
    const text = schema.nodes['text'];
    const next = match.matchType(text);
    expect(next).not.toBeNull();
  });

  it('rejects invalid content', () => {
    const match = schema.nodes['doc'].contentMatch;
    const text = schema.nodes['text'];
    expect(match.matchType(text)).toBeNull();
  });

  it('matchFragment validates full content', () => {
    const match = schema.nodes['doc'].contentMatch;
    const para = schema.node('paragraph', null, [schema.text('ok')]);
    const frag = Fragment.from([para]);
    const result = match.matchFragment(frag);
    expect(result).not.toBeNull();
    expect(result!.validEnd).toBe(true);
  });
});

describe('Slice', () => {
  it('empty slice', () => {
    expect(Slice.empty.size).toBe(0);
    expect(Slice.empty.content.childCount).toBe(0);
  });

  it('slice with content', () => {
    const schema = createTestSchema();
    const text = schema.text('hello');
    const frag = Fragment.from([text]);
    const slice = new Slice(frag, 0, 0);
    expect(slice.size).toBe(5);
  });
});

describe('Node.toJSON / serialization', () => {
  it('round-trips basic document structure', () => {
    const schema = createTestSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('hello')]),
    ]);
    const json = doc.toJSON();
    expect(json).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    });
  });
});
