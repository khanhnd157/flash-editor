/** Create an element with optional class, attributes, and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: {
    className?: string;
    attrs?: Record<string, string>;
    style?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | string)[];
    html?: string;
    onClick?: (e: Event) => void;
  },
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts?.className) node.className = opts.className;
  if (opts?.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  if (opts?.style) Object.assign(node.style, opts.style);
  if (opts?.html) node.innerHTML = opts.html;
  if (opts?.children) {
    for (const c of opts.children) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  if (opts?.onClick) node.addEventListener('click', opts.onClick);
  return node;
}

/** Inject a <style> tag with the given CSS. Returns the style element for removal. */
export function injectCSS(css: string, id?: string): HTMLStyleElement {
  if (id) {
    const existing = document.getElementById(id) as HTMLStyleElement | null;
    if (existing) return existing;
  }
  const style = document.createElement('style');
  if (id) style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/** Position an element near a bounding rect within a container. */
export function positionNear(
  element: HTMLElement,
  targetRect: DOMRect,
  containerRect: DOMRect,
  placement: 'above' | 'below' = 'above',
): void {
  const left = targetRect.left - containerRect.left + targetRect.width / 2 - element.offsetWidth / 2;
  const clampedLeft = Math.max(4, Math.min(left, containerRect.width - element.offsetWidth - 4));

  element.style.left = `${clampedLeft}px`;

  if (placement === 'above') {
    element.style.top = `${targetRect.top - containerRect.top - element.offsetHeight - 8}px`;
  } else {
    element.style.top = `${targetRect.top - containerRect.top + targetRect.height + 4}px`;
  }
}

/** Get the bounding rect of the current DOM selection range. */
export function getSelectionRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

/** Get caret rect even when selection is collapsed. */
export function getCaretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  if (rect.top === 0 && rect.left === 0) return null;
  return rect;
}
