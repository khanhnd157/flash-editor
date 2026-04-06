import type { Node, ResolvedPos } from '@flash/model';

export abstract class Selection {
  constructor(
    readonly $anchor: ResolvedPos,
    readonly $head: ResolvedPos,
  ) {}

  get anchor(): number {
    return this.$anchor.pos;
  }

  get head(): number {
    return this.$head.pos;
  }

  get from(): number {
    return Math.min(this.anchor, this.head);
  }

  get to(): number {
    return Math.max(this.anchor, this.head);
  }

  get $from(): ResolvedPos {
    return this.anchor <= this.head ? this.$anchor : this.$head;
  }

  get $to(): ResolvedPos {
    return this.anchor <= this.head ? this.$head : this.$anchor;
  }

  get empty(): boolean {
    return this.anchor === this.head;
  }

  abstract eq(other: Selection): boolean;
  abstract map(doc: Node, mapping: import('@flash/transform').Mapping): Selection;
  abstract toJSON(): Record<string, unknown>;
}

export class TextSelection extends Selection {
  constructor($anchor: ResolvedPos, $head?: ResolvedPos) {
    super($anchor, $head ?? $anchor);
  }

  get $cursor(): ResolvedPos | null {
    return this.empty ? this.$head : null;
  }

  eq(other: Selection): boolean {
    return (
      other instanceof TextSelection &&
      other.anchor === this.anchor &&
      other.head === this.head
    );
  }

  map(doc: Node, mapping: import('@flash/transform').Mapping): TextSelection {
    const $head = doc.resolve(mapping.map(this.head));
    const $anchor = doc.resolve(mapping.map(this.anchor));
    return new TextSelection($anchor, $head);
  }

  toJSON(): Record<string, unknown> {
    return { type: 'text', anchor: this.anchor, head: this.head };
  }

  static create(doc: Node, anchor: number, head?: number): TextSelection {
    const $anchor = doc.resolve(anchor);
    const $head = head !== undefined ? doc.resolve(head) : $anchor;
    return new TextSelection($anchor, $head);
  }

  static atStart(doc: Node): TextSelection {
    return TextSelection.create(doc, 0);
  }

  static atEnd(doc: Node): TextSelection {
    return TextSelection.create(doc, doc.content.size);
  }
}

export class NodeSelection extends Selection {
  readonly node: Node;

  constructor($pos: ResolvedPos) {
    const node = $pos.nodeAfter;
    if (!node) throw new RangeError('NodeSelection requires a node after the position');
    const $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }

  eq(other: Selection): boolean {
    return other instanceof NodeSelection && other.anchor === this.anchor;
  }

  map(doc: Node, mapping: import('@flash/transform').Mapping): Selection {
    const mapped = mapping.mapResult(this.anchor);
    if (mapped.deleted) return TextSelection.atStart(doc);
    const $pos = doc.resolve(mapped.pos);
    if ($pos.nodeAfter) return new NodeSelection($pos);
    return TextSelection.create(doc, mapped.pos);
  }

  toJSON(): Record<string, unknown> {
    return { type: 'node', anchor: this.anchor };
  }

  static create(doc: Node, pos: number): NodeSelection {
    return new NodeSelection(doc.resolve(pos));
  }
}

export class AllSelection extends Selection {
  constructor(doc: Node) {
    super(doc.resolve(0), doc.resolve(doc.content.size));
  }

  eq(other: Selection): boolean {
    return other instanceof AllSelection;
  }

  map(doc: Node, _mapping: import('@flash/transform').Mapping): AllSelection {
    return new AllSelection(doc);
  }

  toJSON(): Record<string, unknown> {
    return { type: 'all' };
  }
}
