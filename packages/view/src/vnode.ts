/**
 * VNode — lightweight virtual DOM node for the Flash editor view layer.
 * Optimized for rich-text: mark-aware, key-based reconciliation,
 * reference-equality skip for immutable subtrees.
 */

export const VNODE_TEXT = '#text';

export interface VNodeAttrs {
  [key: string]: string | number | boolean | undefined;
}

export interface VNode {
  tag: string;
  attrs: VNodeAttrs | null;
  children: VChild[];
  key: string | null;
  dom: globalThis.Node | null;
}

export type VChild = VNode | VText;

export interface VText {
  tag: typeof VNODE_TEXT;
  text: string;
  dom: globalThis.Text | null;
}

export function isVText(node: VChild): node is VText {
  return node.tag === VNODE_TEXT;
}

export function h(
  tag: string,
  attrs?: VNodeAttrs | null,
  children?: VChild[],
  key?: string | null,
): VNode {
  return {
    tag,
    attrs: attrs ?? null,
    children: children ?? [],
    key: key ?? null,
    dom: null,
  };
}

export function t(text: string): VText {
  return { tag: VNODE_TEXT, text, dom: null };
}
