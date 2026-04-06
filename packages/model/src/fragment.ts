import type { Node } from './node';

export class Fragment {
  readonly size: number;

  private constructor(readonly content: readonly Node[]) {
    let size = 0;
    for (const child of content) {
      size += child.nodeSize;
    }
    this.size = size;
  }

  get childCount(): number {
    return this.content.length;
  }

  child(index: number): Node {
    const child = this.content[index];
    if (!child) throw new RangeError(`Index ${index} out of range for fragment of size ${this.content.length}`);
    return child;
  }

  maybeChild(index: number): Node | undefined {
    return this.content[index];
  }

  forEach(fn: (node: Node, offset: number, index: number) => void): void {
    let offset = 0;
    for (let i = 0; i < this.content.length; i++) {
      fn(this.content[i], offset, i);
      offset += this.content[i].nodeSize;
    }
  }

  findIndex(pos: number): { index: number; offset: number } {
    if (pos === 0) return { index: 0, offset: 0 };
    if (pos === this.size) return { index: this.content.length, offset: pos };
    if (pos < 0 || pos > this.size) throw new RangeError(`Position ${pos} outside of fragment (size ${this.size})`);

    let offset = 0;
    for (let i = 0; i < this.content.length; i++) {
      const end = offset + this.content[i].nodeSize;
      if (end > pos) return { index: i, offset };
      offset = end;
    }
    return { index: this.content.length, offset };
  }

  cut(from: number, to: number = this.size): Fragment {
    if (from === 0 && to === this.size) return this;

    const result: Node[] = [];
    if (to <= from) return Fragment.empty;

    let pos = 0;
    for (let i = 0; pos < to; i++) {
      const child = this.content[i];
      const end = pos + child.nodeSize;

      if (end > from) {
        if (pos < from || end > to) {
          if (child.isText) {
            const textFrom = Math.max(0, from - pos);
            const textTo = Math.min(child.text!.length, to - pos);
            result.push(child.cut(textFrom, textTo));
          } else {
            const innerFrom = Math.max(0, from - pos - 1);
            const innerTo = Math.min(child.content.size, to - pos - 1);
            result.push(child.cut(innerFrom, innerTo));
          }
        } else {
          result.push(child);
        }
      }
      pos = end;
    }

    return new Fragment(result);
  }

  replaceChild(index: number, node: Node): Fragment {
    const copy = this.content.slice();
    copy[index] = node;
    return new Fragment(copy);
  }

  append(other: Fragment): Fragment {
    if (other.size === 0) return this;
    if (this.size === 0) return other;

    const last = this.content[this.content.length - 1];
    const first = other.content[0];

    // Join adjacent text nodes with same marks
    if (last.isText && last.sameMarkup(first)) {
      const joined = last.withText(last.text! + first.text!);
      const content = [
        ...this.content.slice(0, -1),
        joined,
        ...other.content.slice(1),
      ];
      return new Fragment(content);
    }

    return new Fragment([...this.content, ...other.content]);
  }

  eq(other: Fragment): boolean {
    if (this === other) return true;
    if (this.content.length !== other.content.length) return false;
    for (let i = 0; i < this.content.length; i++) {
      if (!this.content[i].eq(other.content[i])) return false;
    }
    return true;
  }

  textBetween(from: number, to: number, blockSeparator?: string, leafText?: string): string {
    let text = '';
    let separated = true;
    this.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const start = Math.max(from, pos) - pos;
        const end = Math.min(to, pos + node.nodeSize) - pos;
        text += node.text!.slice(start, end);
        separated = false;
      } else if (node.isLeaf && leafText) {
        text += leafText;
        separated = false;
      } else if (node.isBlock && !separated && blockSeparator) {
        text += blockSeparator;
        separated = true;
      }
    }, 0);
    return text;
  }

  nodesBetween(
    from: number,
    to: number,
    fn: (node: Node, pos: number, parent: Node | null, index: number) => boolean | void,
    nodeStart: number = 0,
    parent?: Node,
  ): void {
    let pos = 0;
    for (let i = 0; pos < to; i++) {
      const child = this.content[i];
      const end = pos + child.nodeSize;
      if (end > from) {
        if (fn(child, nodeStart + pos, parent ?? null, i) !== false && child.content.size > 0) {
          const start = pos + 1;
          child.content.nodesBetween(
            Math.max(0, from - start),
            Math.min(child.content.size, to - start),
            fn,
            nodeStart + start,
            child,
          );
        }
      }
      pos = end;
    }
  }

  descendants(fn: (node: Node, pos: number, parent: Node | null) => boolean | void): void {
    this.nodesBetween(0, this.size, fn);
  }

  toJSON(): unknown[] {
    return this.content.map((n) => n.toJSON());
  }

  static from(nodes: Node | readonly Node[] | Fragment | null | undefined): Fragment {
    if (!nodes) return Fragment.empty;
    if (nodes instanceof Fragment) return nodes;
    if (Array.isArray(nodes)) {
      if (nodes.length === 0) return Fragment.empty;
      return new Fragment(nodes);
    }
    return new Fragment([nodes as Node]);
  }

  static empty: Fragment = new Fragment([]);
}
