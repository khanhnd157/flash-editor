import type { Node } from '@flash/model';
import type { CustomNodeView, DecorationSource } from '@flash/view';
import { h } from '@flash/view';

export interface SvelteNodeViewProps {
  node: Node;
  decorations: DecorationSource;
}

let nextId = 0;

const vnodeCache = new WeakMap<Node, ReturnType<typeof h>>();

/**
 * Create a CustomNodeView that provides a container for Svelte component mounting.
 * Returns a container div with a data attribute for identification.
 *
 * Usage with Svelte action:
 * ```ts
 * import { SvelteNodeViewRenderer } from '@flash/svelte';
 *
 * const nodeViews = {
 *   image: SvelteNodeViewRenderer(),
 * };
 *
 * // In your Svelte component, find the container by data attribute
 * // and mount your component into it.
 * ```
 */
export function SvelteNodeViewRenderer(): CustomNodeView {
  return (node: Node, _decorations: DecorationSource) => {
    const cached = vnodeCache.get(node);
    if (cached) return cached;

    const id = `flash-snv-${nextId++}`;
    const vnode = h('div', { 'data-flash-svelte-node-view': id, contenteditable: 'false' });

    vnodeCache.set(node, vnode);
    return vnode;
  };
}
