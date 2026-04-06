import type { VNode, VChild, VText, VNodeAttrs } from './vnode';
import { isVText, VNODE_TEXT } from './vnode';

/**
 * Create real DOM from a VNode tree. Returns the root DOM node.
 */
export function createDOM(vnode: VChild): globalThis.Node {
  if (isVText(vnode)) {
    const dom = document.createTextNode(vnode.text);
    vnode.dom = dom;
    return dom;
  }

  const dom = document.createElement(vnode.tag);
  if (vnode.attrs) {
    applyAttrs(dom, null, vnode.attrs);
  }
  for (const child of vnode.children) {
    dom.appendChild(createDOM(child));
  }
  vnode.dom = dom;
  return dom;
}

/**
 * Patch an existing DOM tree to match a new VNode tree.
 * Mutates `newVNode.dom` references. Returns the (possibly replaced) DOM node.
 */
export function patch(
  parentDOM: globalThis.Node,
  oldVNode: VChild,
  newVNode: VChild,
): globalThis.Node {
  // Same reference → skip entirely (immutable model optimization)
  if (oldVNode === newVNode) {
    newVNode.dom = oldVNode.dom;
    return oldVNode.dom!;
  }

  // Different tag type → full replace
  if (oldVNode.tag !== newVNode.tag) {
    const newDOM = createDOM(newVNode);
    parentDOM.replaceChild(newDOM, oldVNode.dom!);
    return newDOM;
  }

  // Text node update
  if (isVText(oldVNode) && isVText(newVNode)) {
    const dom = oldVNode.dom!;
    if (oldVNode.text !== newVNode.text) {
      dom.textContent = newVNode.text;
    }
    newVNode.dom = dom;
    return dom;
  }

  // Same element tag — diff attrs + children
  const oldE = oldVNode as VNode;
  const newE = newVNode as VNode;
  const dom = oldE.dom as HTMLElement;
  newE.dom = dom;

  applyAttrs(dom, oldE.attrs, newE.attrs);
  diffChildren(dom, oldE.children, newE.children);

  return dom;
}

/**
 * Diff and patch child arrays. Uses key-based reconciliation when keys present.
 */
function diffChildren(
  parentDOM: HTMLElement,
  oldChildren: VChild[],
  newChildren: VChild[],
): void {
  // Fast path: both empty
  if (oldChildren.length === 0 && newChildren.length === 0) return;

  // Fast path: old empty → append all
  if (oldChildren.length === 0) {
    for (const child of newChildren) {
      parentDOM.appendChild(createDOM(child));
    }
    return;
  }

  // Fast path: new empty → remove all
  if (newChildren.length === 0) {
    parentDOM.textContent = '';
    return;
  }

  // Check if we have keys
  const hasKeys = !isVText(newChildren[0]) && (newChildren[0] as VNode).key !== null;

  if (hasKeys) {
    diffKeyedChildren(parentDOM, oldChildren, newChildren);
  } else {
    diffUnkeyedChildren(parentDOM, oldChildren, newChildren);
  }
}

/**
 * Simple index-based diff for children without keys.
 */
function diffUnkeyedChildren(
  parentDOM: HTMLElement,
  oldChildren: VChild[],
  newChildren: VChild[],
): void {
  const commonLen = Math.min(oldChildren.length, newChildren.length);

  for (let i = 0; i < commonLen; i++) {
    patch(parentDOM, oldChildren[i], newChildren[i]);
  }

  // Remove extra old children
  for (let i = oldChildren.length - 1; i >= commonLen; i--) {
    parentDOM.removeChild(oldChildren[i].dom!);
  }

  // Append extra new children
  for (let i = commonLen; i < newChildren.length; i++) {
    parentDOM.appendChild(createDOM(newChildren[i]));
  }
}

/**
 * Key-based reconciliation for ordered child lists.
 * Minimizes DOM moves using a map of old keys → old index.
 */
function diffKeyedChildren(
  parentDOM: HTMLElement,
  oldChildren: VChild[],
  newChildren: VChild[],
): void {
  // Build map: key → index for old children
  const oldKeyMap = new Map<string, number>();
  for (let i = 0; i < oldChildren.length; i++) {
    const key = getKey(oldChildren[i]);
    if (key !== null) oldKeyMap.set(key, i);
  }

  const oldUsed = new Set<number>();
  const domChildren = Array.from(parentDOM.childNodes);
  let lastIndex = 0;

  for (let newIdx = 0; newIdx < newChildren.length; newIdx++) {
    const newChild = newChildren[newIdx];
    const newKey = getKey(newChild);

    if (newKey !== null && oldKeyMap.has(newKey)) {
      const oldIdx = oldKeyMap.get(newKey)!;
      oldUsed.add(oldIdx);
      const oldChild = oldChildren[oldIdx];

      // Patch in place
      patch(parentDOM, oldChild, newChild);

      // Move DOM node if order changed
      if (oldIdx < lastIndex) {
        // Needs to move forward — insert before the next sibling
        const refNode = newIdx < newChildren.length - 1
          ? getNextSiblingDOM(parentDOM, newChildren, newIdx)
          : null;
        if (refNode) {
          parentDOM.insertBefore(newChild.dom!, refNode);
        } else {
          parentDOM.appendChild(newChild.dom!);
        }
      }
      lastIndex = Math.max(lastIndex, oldIdx);
    } else {
      // New key — create and insert
      const dom = createDOM(newChild);
      const refNode = getNextSiblingDOM(parentDOM, newChildren, newIdx);
      if (refNode) {
        parentDOM.insertBefore(dom, refNode);
      } else {
        parentDOM.appendChild(dom);
      }
    }
  }

  // Remove unused old children
  for (let i = 0; i < oldChildren.length; i++) {
    if (!oldUsed.has(i) && oldChildren[i].dom) {
      parentDOM.removeChild(oldChildren[i].dom!);
    }
  }
}

function getKey(vnode: VChild): string | null {
  if (isVText(vnode)) return null;
  return (vnode as VNode).key;
}

function getNextSiblingDOM(
  _parentDOM: HTMLElement,
  newChildren: VChild[],
  currentIdx: number,
): globalThis.Node | null {
  // Find the next sibling that already has a DOM node
  for (let i = currentIdx + 1; i < newChildren.length; i++) {
    if (newChildren[i].dom) return newChildren[i].dom;
  }
  return null;
}

/**
 * Apply attribute changes from old → new on a DOM element.
 */
function applyAttrs(
  dom: HTMLElement,
  oldAttrs: VNodeAttrs | null,
  newAttrs: VNodeAttrs | null,
): void {
  // Remove attrs no longer present
  if (oldAttrs) {
    for (const key of Object.keys(oldAttrs)) {
      if (!newAttrs || !(key in newAttrs)) {
        if (key === 'class') {
          dom.className = '';
        } else if (key === 'style') {
          dom.removeAttribute('style');
        } else if (key.startsWith('data-')) {
          dom.removeAttribute(key);
        } else {
          dom.removeAttribute(key);
        }
      }
    }
  }

  // Set new/changed attrs
  if (newAttrs) {
    for (const [key, value] of Object.entries(newAttrs)) {
      if (value === undefined || value === false) {
        dom.removeAttribute(key);
        continue;
      }

      const oldVal = oldAttrs?.[key];
      if (oldVal === value) continue;

      if (key === 'class') {
        dom.className = String(value);
      } else if (key === 'style') {
        dom.setAttribute('style', String(value));
      } else if (value === true) {
        dom.setAttribute(key, '');
      } else {
        dom.setAttribute(key, String(value));
      }
    }
  }
}
