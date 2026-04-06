import type { Component } from 'vue';
import type { Node } from '@flash/model';
import type { CustomNodeView, DecorationSource } from '@flash/view';
import { h as hVNode } from '@flash/view';

export interface VueNodeViewProps {
  node: Node;
  decorations: DecorationSource;
}

export interface VueNodeViewEntry {
  id: string;
  Component: Component;
  node: Node;
  decorations: DecorationSource;
}

/** Shared registry between VueNodeViewRenderer and EditorContent for Teleport rendering. */
export const vueNodeViewRegistry = new Map<string, VueNodeViewEntry>();

let nextId = 0;

const vnodeCache = new WeakMap<Node, { vnode: ReturnType<typeof hVNode>; id: string }>();

/**
 * Create a CustomNodeView that renders a Vue component via Teleport.
 * The component receives `node` and `decorations` as props.
 *
 * Usage:
 * ```ts
 * const nodeViews = {
 *   image: VueNodeViewRenderer(ImageComponent),
 * };
 * ```
 */
export function VueNodeViewRenderer(
  VueComponent: Component,
): CustomNodeView {
  return (node: Node, decorations: DecorationSource) => {
    const cached = vnodeCache.get(node);
    if (cached) {
      vueNodeViewRegistry.set(cached.id, {
        id: cached.id,
        Component: VueComponent,
        node,
        decorations,
      });
      return cached.vnode;
    }

    const id = `flash-vnv-${nextId++}`;
    const vnode = hVNode('div', { 'data-flash-vue-node-view': id, contenteditable: 'false' });

    vnodeCache.set(node, { vnode, id });
    vueNodeViewRegistry.set(id, { id, Component: VueComponent, node, decorations });

    return vnode;
  };
}
