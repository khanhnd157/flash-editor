import type { NodeType } from './schema';
import type { Mark } from './mark';
import { Fragment } from './fragment';
import { ResolvedPos } from './resolved-pos';

export class Node {
  constructor(
    readonly type: NodeType,
    readonly attrs: Record<string, unknown>,
    readonly content: Fragment,
    readonly marks: readonly Mark[],
  ) {}

  get nodeSize(): number {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }

  get childCount(): number {
    return this.content.childCount;
  }

  get textContent(): string {
    return this.isLeaf && this.type.spec.leafText
      ? this.type.spec.leafText(this)
      : this.content.textBetween(0, this.content.size, '');
  }

  get text(): string | undefined {
    return undefined;
  }

  get isBlock(): boolean {
    return this.type.isBlock;
  }

  get isTextblock(): boolean {
    return this.type.isTextblock;
  }

  get isInline(): boolean {
    return this.type.isInline;
  }

  get isText(): boolean {
    return false;
  }

  get isLeaf(): boolean {
    return this.type.isLeaf;
  }

  get isAtom(): boolean {
    return this.type.isAtom;
  }

  child(index: number): Node {
    return this.content.child(index);
  }

  maybeChild(index: number): Node | undefined {
    return this.content.maybeChild(index);
  }

  forEach(fn: (node: Node, offset: number, index: number) => void): void {
    this.content.forEach(fn);
  }

  nodesBetween(
    from: number,
    to: number,
    fn: (node: Node, pos: number, parent: Node | null, index: number) => boolean | void,
    startPos?: number,
  ): void {
    this.content.nodesBetween(from, to, fn, startPos ?? 0, this);
  }

  descendants(fn: (node: Node, pos: number, parent: Node | null) => boolean | void): void {
    this.content.descendants(fn);
  }

  resolve(pos: number): ResolvedPos {
    return ResolvedPos.resolve(this, pos);
  }

  sameMarkup(other: Node): boolean {
    return this.type === other.type && attrsEqual(this.attrs, other.attrs) && Mark.sameSet(this.marks, other.marks);
  }

  eq(other: Node): boolean {
    if (this === other) return true;
    return this.sameMarkup(other) && this.content.eq(other.content);
  }

  mark(marks: readonly Mark[]): Node {
    if (marks === this.marks) return this;
    return new Node(this.type, this.attrs, this.content, marks);
  }

  copy(content: Fragment = Fragment.empty): Node {
    if (content === this.content) return this;
    return new Node(this.type, this.attrs, content, this.marks);
  }

  cut(from: number, to?: number): Node {
    if (from === 0 && to === this.content.size) return this;
    return this.copy(this.content.cut(from, to));
  }

  slice(from: number, to: number = this.content.size): Slice {
    if (from === to) return Slice.empty;
    const $from = this.resolve(from);
    const $to = this.resolve(to);
    const depth = $from.sharedDepth(to);
    const start = $from.start(depth);
    const node = $from.node(depth);
    const content = node.content.cut($from.pos - start, $to.pos - start);
    return new Slice(content, $from.depth - depth, $to.depth - depth);
  }

  replace(from: number, to: number, slice: Slice): Node {
    return replace(this.resolve(from), this.resolve(to), slice);
  }

  rangeHasMark(from: number, to: number, type: import('./schema').MarkType): boolean {
    let found = false;
    if (to > from) {
      this.nodesBetween(from, to, (node) => {
        if (type.isInSet(node.marks)) {
          found = true;
          return false;
        }
      });
    }
    return found;
  }

  canReplaceWith(from: number, to: number, type: import('./schema').NodeType): boolean {
    const match = this.type.contentMatch.matchFragment(this.content, 0, from);
    if (!match) return false;
    const m = match.matchType(type);
    if (!m) return false;
    const rest = m.matchFragment(this.content, to);
    return rest !== null && rest.validEnd;
  }

  withText(_text: string): Node {
    throw new Error('Not a text node');
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = { type: this.type.name };
    if (Object.keys(this.attrs).length > 0) {
      result.attrs = { ...this.attrs };
    }
    if (this.content.childCount > 0) {
      result.content = this.content.toJSON();
    }
    if (this.marks.length > 0) {
      result.marks = this.marks.map((m) => m.toJSON());
    }
    return result;
  }

  static isNode(value: unknown): value is Node {
    return value instanceof Node;
  }
}

export class TextNode extends Node {
  readonly #text: string;

  constructor(
    type: NodeType,
    attrs: Record<string, unknown>,
    text: string,
    marks: readonly Mark[],
  ) {
    super(type, attrs, Fragment.empty, marks);
    if (!text) throw new RangeError('Empty text nodes are not allowed');
    this.#text = text;
  }

  override get text(): string {
    return this.#text;
  }

  override get textContent(): string {
    return this.#text;
  }

  override get isText(): boolean {
    return true;
  }

  override get nodeSize(): number {
    return this.#text.length;
  }

  override mark(marks: readonly Mark[]): TextNode {
    if (marks === this.marks) return this;
    return new TextNode(this.type, this.attrs, this.#text, marks);
  }

  override withText(text: string): TextNode {
    if (text === this.#text) return this;
    return new TextNode(this.type, this.attrs, text, this.marks);
  }

  override cut(from: number = 0, to: number = this.#text.length): TextNode {
    if (from === 0 && to === this.#text.length) return this;
    return this.withText(this.#text.slice(from, to));
  }

  override eq(other: Node): boolean {
    return this.sameMarkup(other) && this.#text === other.text;
  }

  override toJSON(): Record<string, unknown> {
    const result = super.toJSON();
    result.text = this.#text;
    return result;
  }
}

export class Slice {
  constructor(
    readonly content: Fragment,
    readonly openStart: number,
    readonly openEnd: number,
  ) {}

  get size(): number {
    return this.content.size - this.openStart - this.openEnd;
  }

  toJSON(): Record<string, unknown> | null {
    if (this.content.size === 0) return null;
    return {
      content: this.content.toJSON(),
      openStart: this.openStart,
      openEnd: this.openEnd,
    };
  }

  static empty = new Slice(Fragment.empty, 0, 0);
}

// ---- Helpers ----

import { Mark } from './mark';

function attrsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function replace($from: ResolvedPos, $to: ResolvedPos, slice: Slice): Node {
  if (slice.openStart > $from.depth) throw new Error('Insert slice too deep');
  if ($from.depth - slice.openStart !== $to.depth - slice.openEnd) throw new Error('Inconsistent open depths');

  return replaceOuter($from, $to, slice, 0);
}

function replaceOuter($from: ResolvedPos, $to: ResolvedPos, slice: Slice, depth: number): Node {
  const index = $from.index(depth);
  const node = $from.node(depth);

  if (index === $to.index(depth) && depth < $from.depth - slice.openStart) {
    const inner = replaceOuter($from, $to, slice, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else {
    const content = replaceThreeWay($from, $to, slice, depth);
    return node.copy(content);
  }
}

function replaceThreeWay(
  $from: ResolvedPos,
  $to: ResolvedPos,
  slice: Slice,
  depth: number,
): Fragment {
  const openStart = $from.depth > depth ? $from.node(depth + 1) : null;
  const openEnd = $to.depth > depth ? $to.node(depth + 1) : null;

  const fromContent = $from.node(depth).content;
  const start = fromContent.cut(0, $from.pos - $from.start(depth));

  let middle: Fragment;
  if (slice.content.size === 0) {
    middle = Fragment.empty;
  } else {
    let sliceContent = slice.content;
    // Unwrap open starts
    for (let i = 0; i < slice.openStart; i++) {
      sliceContent = sliceContent.child(0).content;
    }
    // Unwrap open ends
    let rightContent = sliceContent;
    for (let i = 0; i < slice.openEnd; i++) {
      rightContent = rightContent.child(rightContent.childCount - 1).content;
    }
    middle = sliceContent;
    void openStart;
    void openEnd;
    void rightContent;
  }

  const toContent = $to.node(depth).content;
  const end = toContent.cut($to.pos - $to.start(depth));

  return start.append(middle).append(end);
}
