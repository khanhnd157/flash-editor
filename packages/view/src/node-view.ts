import type { Node as DocNode, Mark, Schema, NodeType, MarkType } from '@flash/model';
import type { VChild, VNode, VNodeAttrs } from './vnode';
import { h, t } from './vnode';
import type { DecorationSource } from './decoration';

/**
 * NodeViewDesc — describes how to render a document node type as VNodes.
 * Extensions can register custom node views to override default rendering.
 */
export interface NodeViewDesc {
  tag: string;
  attrs?: (node: DocNode) => VNodeAttrs | null;
  contentHole?: boolean;
}

/**
 * MarkViewDesc — describes how to render a mark as a wrapping VNode.
 */
export interface MarkViewDesc {
  tag: string;
  attrs?: (mark: Mark) => VNodeAttrs | null;
}

/**
 * Custom NodeView — fully custom render function.
 * If provided for a node type, overrides the default NodeViewDesc.
 */
export type CustomNodeView = (
  node: DocNode,
  decorations: DecorationSource,
) => VChild;

/**
 * ViewDesc registry — maps node types and mark types to their view descriptors.
 */
export class ViewDescSet {
  private nodeDescs = new Map<string, NodeViewDesc>();
  private markDescs = new Map<string, MarkViewDesc>();
  private customViews = new Map<string, CustomNodeView>();

  registerNode(name: string, desc: NodeViewDesc): void {
    this.nodeDescs.set(name, desc);
  }

  registerMark(name: string, desc: MarkViewDesc): void {
    this.markDescs.set(name, desc);
  }

  registerCustomView(name: string, view: CustomNodeView): void {
    this.customViews.set(name, view);
  }

  getNodeDesc(name: string): NodeViewDesc | undefined {
    return this.nodeDescs.get(name);
  }

  getMarkDesc(name: string): MarkViewDesc | undefined {
    return this.markDescs.get(name);
  }

  getCustomView(name: string): CustomNodeView | undefined {
    return this.customViews.get(name);
  }

  /**
   * Register default views for common schema node/mark types.
   */
  registerDefaults(schema: Schema): void {
    // Block nodes
    this.registerNode('doc', { tag: 'div', attrs: () => ({ class: 'flash-editor', 'data-node': 'doc' }) });
    this.registerNode('paragraph', { tag: 'p', contentHole: true });
    this.registerNode('blockquote', { tag: 'blockquote', contentHole: true });
    this.registerNode('horizontal_rule', { tag: 'hr' });
    this.registerNode('hard_break', { tag: 'br' });

    if (schema.nodes['heading']) {
      this.registerNode('heading', {
        tag: 'h1',
        attrs: (node) => {
          const level = (node.attrs.level as number) ?? 1;
          return { 'data-level': level };
        },
        contentHole: true,
      });
    }

    if (schema.nodes['code_block']) {
      this.registerNode('code_block', {
        tag: 'pre',
        attrs: (node) => {
          const lang = node.attrs.language as string | undefined;
          return lang ? { 'data-language': lang } : null;
        },
        contentHole: true,
      });
    }

    if (schema.nodes['bullet_list']) {
      this.registerNode('bullet_list', { tag: 'ul', contentHole: true });
    }
    if (schema.nodes['ordered_list']) {
      this.registerNode('ordered_list', { tag: 'ol', contentHole: true });
    }
    if (schema.nodes['list_item']) {
      this.registerNode('list_item', { tag: 'li', contentHole: true });
    }

    if (schema.nodes['image']) {
      this.registerNode('image', {
        tag: 'img',
        attrs: (node) => ({
          src: node.attrs.src as string,
          alt: node.attrs.alt as string | undefined,
          title: node.attrs.title as string | undefined,
        }),
      });
    }

    // Marks
    this.registerMark('bold', { tag: 'strong' });
    this.registerMark('italic', { tag: 'em' });
    this.registerMark('strike', { tag: 's' });
    this.registerMark('underline', { tag: 'u' });
    this.registerMark('code', { tag: 'code' });
    this.registerMark('subscript', { tag: 'sub' });
    this.registerMark('superscript', { tag: 'sup' });

    if (schema.marks['link']) {
      this.registerMark('link', {
        tag: 'a',
        attrs: (mark) => ({
          href: mark.attrs.href as string,
          target: mark.attrs.target as string | undefined,
          rel: 'noopener noreferrer',
        }),
      });
    }

    if (schema.marks['highlight']) {
      this.registerMark('highlight', {
        tag: 'mark',
        attrs: (mark) => {
          const color = mark.attrs.color as string | undefined;
          return color ? { style: `background-color: ${color}` } : null;
        },
      });
    }
  }
}

/**
 * Render a document node tree to a VNode tree.
 */
export function renderDoc(
  doc: DocNode,
  viewDescs: ViewDescSet,
  decorations?: DecorationSource,
): VNode {
  return renderNode(doc, viewDescs, decorations) as VNode;
}

function renderNode(
  node: DocNode,
  viewDescs: ViewDescSet,
  decorations?: DecorationSource,
): VChild {
  // Text nodes
  if (node.isText) {
    return renderTextWithMarks(node, viewDescs);
  }

  // Custom view?
  const custom = viewDescs.getCustomView(node.type.name);
  if (custom) {
    return custom(node, decorations ?? emptyDecoSource);
  }

  // Standard node view
  const desc = viewDescs.getNodeDesc(node.type.name);
  const tag = desc?.tag ?? (node.isBlock ? 'div' : 'span');
  const attrs = desc?.attrs?.(node) ?? null;

  // Heading special case: use h1-h6 tag
  let actualTag = tag;
  if (node.type.name === 'heading') {
    const level = Math.min(6, Math.max(1, (node.attrs.level as number) ?? 1));
    actualTag = `h${level}`;
  }

  // Leaf node (no content hole)
  if (node.isLeaf) {
    return h(actualTag, attrs, [], nodeKey(node));
  }

  // Render children
  const children = renderChildren(node, viewDescs, decorations);
  return h(actualTag, attrs, children, nodeKey(node));
}

/**
 * Render children of a block/container node.
 * Groups adjacent text nodes with the same marks for efficient mark wrapping.
 */
function renderChildren(
  parent: DocNode,
  viewDescs: ViewDescSet,
  decorations?: DecorationSource,
): VChild[] {
  const children: VChild[] = [];

  parent.forEach((child, _offset, index) => {
    if (child.isText) {
      children.push(renderTextWithMarks(child, viewDescs));
    } else {
      children.push(renderNode(child, viewDescs, decorations));
    }
  });

  return children;
}

/**
 * Render a text node, wrapping it with mark VNodes.
 * E.g., bold italic text → <strong><em>#text</em></strong>
 */
function renderTextWithMarks(node: DocNode, viewDescs: ViewDescSet): VChild {
  let result: VChild = t(node.text ?? '');

  // Wrap with marks from innermost to outermost
  for (let i = node.marks.length - 1; i >= 0; i--) {
    const mark = node.marks[i];
    const desc = viewDescs.getMarkDesc(mark.type.name);
    const tag = desc?.tag ?? 'span';
    const attrs = desc?.attrs?.(mark) ?? null;
    result = h(tag, attrs, [result]);
  }

  return result;
}

function nodeKey(node: DocNode): string | null {
  // Leaf atoms get a key based on type for stable diffing
  if (node.isAtom) return `atom-${node.type.name}`;
  return null;
}

const emptyDecoSource: DecorationSource = {
  find: () => [],
  map: (mapping) => emptyDecoSource,
};
