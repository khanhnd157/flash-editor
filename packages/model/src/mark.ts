import type { MarkType } from './schema';

export interface MarkSpec {
  attrs?: Record<string, AttributeSpec>;
  inclusive?: boolean;
  excludes?: string;
  group?: string;
  spanning?: boolean;
  parseDOM?: ParseRule[];
  toDOM?: (mark: Mark) => DOMOutputSpec;
}

export interface AttributeSpec {
  default?: unknown;
}

export interface ParseRule {
  tag?: string;
  style?: string;
  priority?: number;
  getAttrs?: (node: HTMLElement | string) => Record<string, unknown> | false | null;
}

export type DOMOutputSpec =
  | string
  | [string, ...Array<DOMOutputSpec | Record<string, string> | 0>];

export class Mark {
  constructor(
    readonly type: MarkType,
    readonly attrs: Record<string, unknown>,
  ) {}

  eq(other: Mark): boolean {
    if (this === other) return true;
    if (this.type !== other.type) return false;
    return attrsEqual(this.attrs, other.attrs);
  }

  addToSet(set: readonly Mark[]): readonly Mark[] {
    let found = false;
    const result: Mark[] = [];

    for (const mark of set) {
      if (mark.type === this.type) {
        if (this.eq(mark)) return set;
        found = true;
        result.push(this);
      } else {
        if (!found && mark.type.rank > this.type.rank) {
          result.push(this);
          found = true;
        }
        result.push(mark);
      }
    }

    if (!found) result.push(this);
    return result;
  }

  removeFromSet(set: readonly Mark[]): readonly Mark[] {
    for (let i = 0; i < set.length; i++) {
      if (this.eq(set[i])) {
        return [...set.slice(0, i), ...set.slice(i + 1)];
      }
    }
    return set;
  }

  isInSet(set: readonly Mark[]): boolean {
    for (const mark of set) {
      if (this.eq(mark)) return true;
    }
    return false;
  }

  static none: readonly Mark[] = Object.freeze([]);

  static sameSet(a: readonly Mark[], b: readonly Mark[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!a[i].eq(b[i])) return false;
    }
    return true;
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = { type: this.type.name };
    if (Object.keys(this.attrs).length > 0) {
      result.attrs = { ...this.attrs };
    }
    return result;
  }
}

function attrsEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
