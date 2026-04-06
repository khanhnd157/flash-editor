import type { Node } from './node';

export class ResolvedPos {
  readonly depth: number;

  private constructor(
    readonly pos: number,
    private readonly path: Array<Node | number>,
    readonly parentOffset: number,
  ) {
    this.depth = (path.length / 3) - 1;
  }

  node(depth?: number): Node {
    const d = this.resolveDepth(depth);
    return this.path[d * 3] as Node;
  }

  index(depth?: number): number {
    const d = this.resolveDepth(depth);
    return this.path[d * 3 + 1] as number;
  }

  start(depth?: number): number {
    const d = this.resolveDepth(depth);
    if (d === 0) return 0;
    return (this.path[d * 3 - 1] as number) + 1;
  }

  end(depth?: number): number {
    const d = this.resolveDepth(depth);
    return this.start(d) + this.node(d).content.size;
  }

  before(depth?: number): number {
    const d = this.resolveDepth(depth);
    if (d === 0) throw new RangeError('No position before the top-level node');
    return d === this.depth + 1 ? this.pos : (this.path[d * 3 - 1] as number);
  }

  after(depth?: number): number {
    const d = this.resolveDepth(depth);
    if (d === 0) throw new RangeError('No position after the top-level node');
    return d === this.depth + 1
      ? this.pos
      : (this.path[d * 3 - 1] as number) + (this.path[d * 3] as Node).nodeSize;
  }

  get parent(): Node {
    return this.node(this.depth);
  }

  get doc(): Node {
    return this.node(0);
  }

  get textOffset(): number {
    const node = this.parent;
    const index = this.index();
    if (index < node.childCount) {
      const child = node.child(index);
      if (child.isText) return this.pos - this.start() - this.offsetBefore(index);
    }
    return 0;
  }

  get nodeAfter(): Node | null {
    const parent = this.parent;
    const index = this.index(this.depth);
    if (index >= parent.childCount) return null;
    const child = parent.child(index);
    const textOff = this.textOffset;
    if (textOff > 0) {
      return (child as import('./node').TextNode).cut(textOff);
    }
    return child;
  }

  get nodeBefore(): Node | null {
    const index = this.index(this.depth);
    const textOff = this.textOffset;
    if (textOff > 0) {
      return (this.parent.child(index) as import('./node').TextNode).cut(0, textOff);
    }
    if (index === 0) return null;
    return this.parent.child(index - 1);
  }

  sharedDepth(pos: number): number {
    for (let depth = this.depth; depth > 0; depth--) {
      if (this.start(depth) <= pos && this.end(depth) >= pos) return depth;
    }
    return 0;
  }

  private resolveDepth(depth?: number): number {
    if (depth === undefined) return this.depth;
    if (depth < 0) return this.depth + depth + 1;
    return depth;
  }

  private offsetBefore(index: number): number {
    let offset = 0;
    const parent = this.parent;
    for (let i = 0; i < index; i++) {
      offset += parent.child(i).nodeSize;
    }
    return offset;
  }

  static resolve(doc: Node, pos: number): ResolvedPos {
    if (pos < 0 || pos > doc.content.size) {
      throw new RangeError(`Position ${pos} out of range (0..${doc.content.size})`);
    }

    const path: Array<Node | number> = [];
    let start = 0;
    let parentOffset = pos;
    let node = doc;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { index, offset } = node.content.findIndex(parentOffset);
      const rem = parentOffset - offset;

      path.push(node, index, start);

      if (rem === 0) break;

      const child = node.content.child(index);
      if (child.isText) break;

      parentOffset = rem - 1;
      start += offset + 1;
      node = child;
    }

    return new ResolvedPos(pos, path, parentOffset);
  }
}
