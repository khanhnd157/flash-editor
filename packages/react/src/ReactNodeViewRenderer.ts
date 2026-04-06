import type { ComponentType } from 'react';
import type { Node } from '@flash/model';
import type { CustomNodeView, DecorationSource } from '@flash/view';
import { h } from '@flash/view';

export interface NodeViewProps {
  node: Node;
  decorations: DecorationSource;
}

export interface NodeViewEntry {
  id: string;
  Component: ComponentType<NodeViewProps>;
  node: Node;
  decorations: DecorationSource;
}

/** Shared registry between ReactNodeViewRenderer and EditorContent for portal rendering. */
export const nodeViewRegistry = new Map<string, NodeViewEntry>();

let nextId = 0;

// Cache by Node identity to avoid re-creating VNodes on every render cycle
const vnodeCache = new WeakMap<Node, { vnode: ReturnType<typeof h>; id: string }>();

/**
 * Create a CustomNodeView that renders a React component via portals.
 * The component receives `node` and `decorations` as props.
 *
 * Usage:
 * ```ts
 * const nodeViews = {
 *   image: ReactNodeViewRenderer(ImageComponent),
 * };
 * ```
 */
export function ReactNodeViewRenderer(
  Component: ComponentType<NodeViewProps>,
): CustomNodeView {
  return (node: Node, decorations: DecorationSource) => {
    // Return cached VNode for same node reference (immutable model optimization)
    const cached = vnodeCache.get(node);
    if (cached) {
      // Update registry entry with latest decorations
      nodeViewRegistry.set(cached.id, { id: cached.id, Component, node, decorations });
      return cached.vnode;
    }

    const id = `flash-rnv-${nextId++}`;
    const vnode = h('div', { 'data-flash-react-node-view': id, contenteditable: 'false' });

    vnodeCache.set(node, { vnode, id });
    nodeViewRegistry.set(id, { id, Component, node, decorations });

    return vnode;
  };
}
