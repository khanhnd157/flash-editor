import { describe, it, expect, beforeEach } from 'vitest';
import { h, t, isVText, type VNode, type VText, type VChild } from '../vnode';
import { createDOM, patch } from '../dom';
import { ViewDescSet, renderDoc } from '../node-view';
import { DecorationSet, inline as inlineDeco, widget as widgetDeco } from '../decoration';
import { Schema, Fragment, type SchemaSpec } from '@flash/model';
import type { Node as DocNode } from '@flash/model';

// ---- Test schema helper ----

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

function makeDoc(schema: Schema, ...paragraphs: string[]): DocNode {
  const paras = paragraphs.map((text) =>
    schema.node('paragraph', null, text ? [schema.text(text)] : []),
  );
  return schema.node('doc', null, paras);
}

// =============================================
// VNode tests
// =============================================

describe('VNode / VText', () => {
  it('h() creates a VNode', () => {
    const node = h('div', { class: 'test' }, [t('hello')]);
    expect(node.tag).toBe('div');
    expect(node.attrs).toEqual({ class: 'test' });
    expect(node.children.length).toBe(1);
    expect(node.dom).toBeNull();
  });

  it('t() creates a VText', () => {
    const text = t('hello');
    expect(text.tag).toBe('#text');
    expect(text.text).toBe('hello');
    expect(text.dom).toBeNull();
  });

  it('isVText() detects text nodes', () => {
    expect(isVText(t('a'))).toBe(true);
    expect(isVText(h('span'))).toBe(false);
  });

  it('h() defaults', () => {
    const node = h('p');
    expect(node.attrs).toBeNull();
    expect(node.children).toEqual([]);
    expect(node.key).toBeNull();
  });

  it('h() with key', () => {
    const node = h('div', null, [], 'my-key');
    expect(node.key).toBe('my-key');
  });
});

// =============================================
// DOM creation tests
// =============================================

describe('createDOM', () => {
  it('creates element from VNode', () => {
    const vnode = h('div', { class: 'test', id: 'main' }, [t('hello')]);
    const dom = createDOM(vnode);
    expect(dom.nodeName).toBe('DIV');
    expect((dom as HTMLElement).className).toBe('test');
    expect((dom as HTMLElement).id).toBe('main');
    expect(dom.textContent).toBe('hello');
    expect(vnode.dom).toBe(dom);
  });

  it('creates text node from VText', () => {
    const vtext = t('world');
    const dom = createDOM(vtext);
    expect(dom.nodeType).toBe(3);
    expect(dom.textContent).toBe('world');
    expect(vtext.dom).toBe(dom);
  });

  it('creates nested structure', () => {
    const vnode = h('ul', null, [
      h('li', null, [t('one')]),
      h('li', null, [t('two')]),
    ]);
    const dom = createDOM(vnode) as HTMLElement;
    expect(dom.tagName).toBe('UL');
    expect(dom.children.length).toBe(2);
    expect(dom.children[0].textContent).toBe('one');
    expect(dom.children[1].textContent).toBe('two');
  });

  it('handles boolean attrs', () => {
    const vnode = h('input', { disabled: true, readonly: false });
    const dom = createDOM(vnode) as HTMLElement;
    expect(dom.getAttribute('disabled')).toBe('');
    expect(dom.hasAttribute('readonly')).toBe(false);
  });
});

// =============================================
// Patch / diff tests
// =============================================

describe('patch', () => {
  it('updates text content', () => {
    const old = h('p', null, [t('old')]);
    const dom = createDOM(old) as HTMLElement;

    const next = h('p', null, [t('new')]);
    patch(dom, old, next);

    expect(dom.textContent).toBe('new');
    expect(next.dom).toBe(dom);
  });

  it('updates attributes', () => {
    const old = h('div', { class: 'a' });
    const dom = createDOM(old) as HTMLElement;

    const next = h('div', { class: 'b', id: 'x' });
    patch(dom, old, next);

    expect(dom.className).toBe('b');
    expect(dom.id).toBe('x');
  });

  it('removes old attributes', () => {
    const old = h('div', { class: 'a', id: 'x' });
    const dom = createDOM(old) as HTMLElement;
    expect(dom.id).toBe('x');

    const next = h('div', { class: 'b' });
    patch(dom, old, next);

    expect(dom.className).toBe('b');
    expect(dom.id).toBe('');
  });

  it('adds children', () => {
    const old = h('ul', null, []);
    const dom = createDOM(old) as HTMLElement;

    const next = h('ul', null, [h('li', null, [t('item')])]);
    patch(dom, old, next);

    expect(dom.children.length).toBe(1);
    expect(dom.textContent).toBe('item');
  });

  it('removes children', () => {
    const old = h('ul', null, [h('li', null, [t('a')]), h('li', null, [t('b')])]);
    const dom = createDOM(old) as HTMLElement;

    const next = h('ul', null, [h('li', null, [t('a')])]);
    patch(dom, old, next);

    expect(dom.children.length).toBe(1);
    expect(dom.textContent).toBe('a');
  });

  it('reorders keyed children', () => {
    const old = h('ul', null, [
      h('li', null, [t('A')], 'a'),
      h('li', null, [t('B')], 'b'),
      h('li', null, [t('C')], 'c'),
    ]);
    const dom = createDOM(old) as HTMLElement;
    const origB = dom.children[1];

    const next = h('ul', null, [
      h('li', null, [t('C')], 'c'),
      h('li', null, [t('A')], 'a'),
      h('li', null, [t('B')], 'b'),
    ]);
    patch(dom, old, next);

    expect(dom.children.length).toBe(3);
    expect(dom.children[0].textContent).toBe('C');
    expect(dom.children[1].textContent).toBe('A');
    expect(dom.children[2].textContent).toBe('B');
    // B's DOM node should be reused
    expect(dom.children[2]).toBe(origB);
  });

  it('skips identical subtrees (reference equality)', () => {
    const child = h('span', null, [t('same')]);
    const old = h('div', null, [child]);
    const dom = createDOM(old) as HTMLElement;
    const origSpan = dom.children[0];

    // Same VChild reference → skip
    const next = h('div', null, [child]);
    patch(dom, old, next);

    expect(dom.children[0]).toBe(origSpan);
  });
});

// =============================================
// Node view rendering tests
// =============================================

describe('renderDoc / ViewDescSet', () => {
  let schema: Schema;
  let viewDescs: ViewDescSet;

  beforeEach(() => {
    schema = createTestSchema();
    viewDescs = new ViewDescSet();
    viewDescs.registerDefaults(schema);
  });

  it('renders empty paragraph', () => {
    const doc = makeDoc(schema, '');
    const vnode = renderDoc(doc, viewDescs);
    expect(vnode.tag).toBe('div');
    // Should have one child (the paragraph)
    expect(vnode.children.length).toBe(1);
  });

  it('renders paragraph with text', () => {
    const doc = makeDoc(schema, 'hello');
    const vnode = renderDoc(doc, viewDescs);
    const para = vnode.children[0] as VNode;
    expect(para.tag).toBe('p');
    expect(para.children.length).toBe(1);
    expect(isVText(para.children[0])).toBe(true);
    expect((para.children[0] as VText).text).toBe('hello');
  });

  it('renders multiple paragraphs', () => {
    const doc = makeDoc(schema, 'first', 'second');
    const vnode = renderDoc(doc, viewDescs);
    expect(vnode.children.length).toBe(2);
    const p1 = vnode.children[0] as VNode;
    const p2 = vnode.children[1] as VNode;
    expect(p1.tag).toBe('p');
    expect(p2.tag).toBe('p');
    expect((p1.children[0] as VText).text).toBe('first');
    expect((p2.children[0] as VText).text).toBe('second');
  });

  it('renders bold text with <strong> wrapper', () => {
    const boldMark = schema.mark('bold');
    const text = schema.text('bold text', [boldMark]);
    const para = schema.node('paragraph', null, [text]);
    const doc = schema.node('doc', null, [para]);

    const vnode = renderDoc(doc, viewDescs);
    const pVNode = vnode.children[0] as VNode;
    const strongVNode = pVNode.children[0] as VNode;
    expect(strongVNode.tag).toBe('strong');
    expect((strongVNode.children[0] as VText).text).toBe('bold text');
  });

  it('renders nested marks (bold + italic)', () => {
    const bold = schema.mark('bold');
    const italic = schema.mark('italic');
    const text = schema.text('both', [bold, italic]);
    const para = schema.node('paragraph', null, [text]);
    const doc = schema.node('doc', null, [para]);

    const vnode = renderDoc(doc, viewDescs);
    const pVNode = vnode.children[0] as VNode;
    // outer: strong, inner: em (because marks wrap inside-out: last mark in array wraps first)
    const outerMark = pVNode.children[0] as VNode;
    expect(outerMark.tag).toBe('strong');
    const innerMark = outerMark.children[0] as VNode;
    expect(innerMark.tag).toBe('em');
    expect((innerMark.children[0] as VText).text).toBe('both');
  });

  it('renders heading with correct tag', () => {
    const heading = schema.node('heading', { level: 2 }, [schema.text('Title')]);
    const doc = schema.node('doc', null, [heading]);

    const vnode = renderDoc(doc, viewDescs);
    const headingVNode = vnode.children[0] as VNode;
    expect(headingVNode.tag).toBe('h2');
    expect((headingVNode.children[0] as VText).text).toBe('Title');
  });

  it('renders blockquote with nested paragraph', () => {
    const para = schema.node('paragraph', null, [schema.text('quoted')]);
    const bq = schema.node('blockquote', null, [para]);
    const doc = schema.node('doc', null, [bq]);

    const vnode = renderDoc(doc, viewDescs);
    const bqVNode = vnode.children[0] as VNode;
    expect(bqVNode.tag).toBe('blockquote');
    const innerP = bqVNode.children[0] as VNode;
    expect(innerP.tag).toBe('p');
    expect((innerP.children[0] as VText).text).toBe('quoted');
  });

  it('custom view overrides default rendering', () => {
    viewDescs.registerCustomView('paragraph', (node) => {
      return h('section', { 'data-custom': 'true' }, [t(node.textContent)]);
    });

    const doc = makeDoc(schema, 'custom');
    const vnode = renderDoc(doc, viewDescs);
    const section = vnode.children[0] as VNode;
    expect(section.tag).toBe('section');
    expect(section.attrs?.['data-custom']).toBe('true');
  });
});

// =============================================
// DecorationSet tests
// =============================================

describe('DecorationSet', () => {
  it('empty set returns no decorations', () => {
    const empty = DecorationSet.empty;
    expect(empty.find()).toEqual([]);
  });

  it('creates inline decoration', () => {
    const deco = DecorationSet.create([
      inlineDeco(1, 5, { class: 'highlight' }),
    ]);
    const found = deco.find();
    expect(found.length).toBe(1);
    expect(found[0].from).toBe(1);
    expect(found[0].to).toBe(5);
  });

  it('creates widget decoration', () => {
    const widget = document.createElement('span');
    widget.textContent = '★';
    const deco = DecorationSet.create([
      widgetDeco(3, () => widget),
    ]);
    const found = deco.find();
    expect(found.length).toBe(1);
    expect(found[0].type).toBe('widget');
  });

  it('filters decorations by range', () => {
    const deco = DecorationSet.create([
      inlineDeco(1, 5, { class: 'a' }),
      inlineDeco(10, 15, { class: 'b' }),
      inlineDeco(3, 8, { class: 'c' }),
    ]);
    const found = deco.find(2, 6);
    // Should include decorations overlapping [2, 6]: a (1-5) and c (3-8)
    expect(found.length).toBe(2);
  });

  it('add() merges decorations', () => {
    const base = DecorationSet.create([
      inlineDeco(1, 5, { class: 'a' }),
    ]);
    const added = base.add([
      inlineDeco(10, 15, { class: 'b' }),
    ]);
    expect(added.find().length).toBe(2);
  });

  it('remove() removes matched decorations', () => {
    const decoA = inlineDeco(1, 5, { class: 'a' });
    const decoB = inlineDeco(10, 15, { class: 'b' });
    const set = DecorationSet.create([decoA, decoB]);
    const removed = set.remove([decoA]);
    expect(removed.find().length).toBe(1);
    expect(removed.find()[0].from).toBe(10);
  });
});

// =============================================
// History plugin tests
// =============================================

describe('history plugin', () => {
  let schema: Schema;

  beforeEach(() => {
    schema = createTestSchema();
  });

  it('undo returns false when nothing to undo', async () => {
    const { history, undo } = await import('../history');
    const { EditorState } = await import('@flash/state');
    const doc = makeDoc(schema, 'hello');
    const state = EditorState.create({ doc, plugins: [history()] });
    expect(undo(state)).toBe(false);
  });

  it('redo returns false when nothing to redo', async () => {
    const { history, redo } = await import('../history');
    const { EditorState } = await import('@flash/state');
    const doc = makeDoc(schema, 'hello');
    const state = EditorState.create({ doc, plugins: [history()] });
    expect(redo(state)).toBe(false);
  });

  it('undoDepth/redoDepth report correctly', async () => {
    const { history, undoDepth, redoDepth } = await import('../history');
    const { EditorState } = await import('@flash/state');
    const doc = makeDoc(schema, 'hello');
    const state = EditorState.create({ doc, plugins: [history()] });
    expect(undoDepth(state)).toBe(0);
    expect(redoDepth(state)).toBe(0);
  });

  it('records edits and enables undo', async () => {
    const { history, undo, undoDepth } = await import('../history');
    const { EditorState, TextSelection } = await import('@flash/state');
    const doc = makeDoc(schema, 'hello');
    let state = EditorState.create({ doc, plugins: [history()] });

    // Make an edit
    const tr = state.tr;
    tr.insertText(6, ' world');
    state = state.apply(tr);
    expect(undoDepth(state)).toBe(1);

    // Undo should be possible
    expect(undo(state)).toBe(true);
  });
});
