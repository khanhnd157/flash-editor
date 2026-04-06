import { Node, TextNode } from './node';
import { Fragment } from './fragment';
import { Mark } from './mark';
import type { MarkSpec, AttributeSpec, DOMOutputSpec } from './mark';
import { ContentMatch } from './content-match';

export type { MarkSpec, AttributeSpec, DOMOutputSpec };

export interface NodeSpec {
  content?: string;
  marks?: string;
  group?: string;
  inline?: boolean;
  atom?: boolean;
  attrs?: Record<string, AttributeSpec>;
  selectable?: boolean;
  draggable?: boolean;
  code?: boolean;
  defining?: boolean;
  isolating?: boolean;
  leafText?: (node: Node) => string;
  toDOM?: (node: Node) => DOMOutputSpec;
  parseDOM?: Array<{
    tag?: string;
    priority?: number;
    getAttrs?: (node: HTMLElement) => Record<string, unknown> | false | null;
  }>;
}

export interface SchemaSpec {
  nodes: Record<string, NodeSpec>;
  marks?: Record<string, MarkSpec>;
  topNode?: string;
}

export class Schema {
  readonly spec: SchemaSpec;
  readonly nodes: Record<string, NodeType>;
  readonly marks: Record<string, MarkType>;
  readonly topNodeType: NodeType;

  constructor(spec: SchemaSpec) {
    this.spec = spec;
    this.nodes = {};
    this.marks = {};

    // Build node types
    let rank = 0;
    for (const [name, nodeSpec] of Object.entries(spec.nodes)) {
      this.nodes[name] = new NodeType(name, nodeSpec, rank++, this);
    }

    // Build mark types
    rank = 0;
    if (spec.marks) {
      for (const [name, markSpec] of Object.entries(spec.marks)) {
        this.marks[name] = new MarkType(name, markSpec, rank++, this);
      }
    }

    // Compile content expressions
    for (const type of Object.values(this.nodes)) {
      type._resolveContentMatch();
    }

    const topName = spec.topNode ?? 'doc';
    this.topNodeType = this.nodes[topName];
    if (!this.topNodeType) {
      throw new Error(`Top node type "${topName}" not defined in schema`);
    }
  }

  node(
    type: string | NodeType,
    attrs?: Record<string, unknown>,
    content?: Fragment | Node | readonly Node[],
    marks?: readonly Mark[],
  ): Node {
    const nodeType = typeof type === 'string' ? this.nodeType(type) : type;
    const resolvedAttrs = nodeType.computeAttrs(attrs);
    const fragment = Fragment.from(content);
    return new Node(nodeType, resolvedAttrs, fragment, marks ?? Mark.none);
  }

  text(text: string, marks?: readonly Mark[]): TextNode {
    const type = this.nodes['text'];
    if (!type) throw new Error('Schema has no text node type');
    return new TextNode(type, {}, text, marks ?? Mark.none);
  }

  mark(type: string | MarkType, attrs?: Record<string, unknown>): Mark {
    const markType = typeof type === 'string' ? this.markType(type) : type;
    return markType.create(attrs);
  }

  nodeType(name: string): NodeType {
    const type = this.nodes[name];
    if (!type) throw new Error(`Unknown node type: ${name}`);
    return type;
  }

  markType(name: string): MarkType {
    const type = this.marks[name];
    if (!type) throw new Error(`Unknown mark type: ${name}`);
    return type;
  }
}

export class NodeType {
  contentMatch!: ContentMatch;
  readonly isBlock: boolean;
  readonly isInline: boolean;
  readonly isText: boolean;
  readonly isLeaf: boolean;
  readonly isAtom: boolean;
  readonly groups: string[];

  constructor(
    readonly name: string,
    readonly spec: NodeSpec,
    readonly rank: number,
    readonly schema: Schema,
  ) {
    this.isInline = !!spec.inline || name === 'text';
    this.isBlock = !this.isInline;
    this.isText = name === 'text';
    this.isLeaf = !spec.content;
    this.isAtom = !!spec.atom || this.isLeaf;
    this.groups = spec.group ? spec.group.split(' ') : [];
  }

  _resolveContentMatch(): void {
    this.contentMatch = ContentMatch.parse(this.spec.content ?? '', this.schema);
  }

  create(
    attrs?: Record<string, unknown>,
    content?: Fragment | Node | readonly Node[],
    marks?: readonly Mark[],
  ): Node {
    if (this.isText) throw new Error('Use schema.text() to create text nodes');
    const resolvedAttrs = this.computeAttrs(attrs);
    return new Node(this, resolvedAttrs, Fragment.from(content), marks ?? Mark.none);
  }

  createAndFill(
    attrs?: Record<string, unknown>,
    content?: Fragment | Node | readonly Node[],
    marks?: readonly Mark[],
  ): Node | null {
    const resolvedAttrs = this.computeAttrs(attrs);
    const fragment = Fragment.from(content);

    // Try to fill missing required content
    const match = this.contentMatch.matchFragment(fragment);
    if (!match) return null;
    const fill = match.fillBefore(Fragment.empty, true);
    if (!fill) return null;

    return new Node(this, resolvedAttrs, fragment.append(fill), marks ?? Mark.none);
  }

  computeAttrs(attrs?: Record<string, unknown>): Record<string, unknown> {
    if (!this.spec.attrs) return attrs ?? {};
    const result: Record<string, unknown> = {};
    for (const [name, spec] of Object.entries(this.spec.attrs)) {
      const value = attrs?.[name];
      if (value !== undefined) {
        result[name] = value;
      } else if (spec.default !== undefined) {
        result[name] = spec.default;
      } else {
        throw new Error(`Missing required attribute: ${name}`);
      }
    }
    return result;
  }

  allowsMarkType(markType: MarkType): boolean {
    const marks = this.spec.marks;
    if (marks === undefined) return true;
    if (marks === '') return false;
    return marks.split(' ').some(
      (name) => name === markType.name || markType.groups.includes(name),
    );
  }

  isInGroup(group: string): boolean {
    return this.groups.includes(group);
  }
}

export class MarkType {
  readonly groups: string[];
  readonly inclusive: boolean;
  readonly excludes: string | null;

  constructor(
    readonly name: string,
    readonly spec: MarkSpec,
    readonly rank: number,
    readonly schema: Schema,
  ) {
    this.groups = spec.group ? spec.group.split(' ') : [];
    this.inclusive = spec.inclusive !== false;
    this.excludes = spec.excludes ?? null;
  }

  create(attrs?: Record<string, unknown>): Mark {
    const resolvedAttrs = this.computeAttrs(attrs);
    return new Mark(this, resolvedAttrs);
  }

  computeAttrs(attrs?: Record<string, unknown>): Record<string, unknown> {
    if (!this.spec.attrs) return attrs ?? {};
    const result: Record<string, unknown> = {};
    for (const [name, spec] of Object.entries(this.spec.attrs)) {
      const value = attrs?.[name];
      if (value !== undefined) {
        result[name] = value;
      } else if (spec.default !== undefined) {
        result[name] = spec.default;
      } else {
        throw new Error(`Missing required mark attribute: ${name}`);
      }
    }
    return result;
  }

  isInSet(set: readonly Mark[]): Mark | undefined {
    for (const mark of set) {
      if (mark.type === this) return mark;
    }
    return undefined;
  }

  excludesType(other: MarkType): boolean {
    if (this.excludes === null) return false;
    if (this.excludes === '_') return true;
    return this.excludes.split(' ').some(
      (name) => name === other.name || other.groups.includes(name),
    );
  }
}
