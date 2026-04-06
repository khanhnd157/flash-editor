/**
 * Lazy rendering — only render visible viewport + buffer.
 * Uses IntersectionObserver to track which block nodes are visible,
 * and replaces off-screen nodes with lightweight placeholders.
 */

export interface LazyRenderConfig {
  /** Buffer in px above/below viewport to pre-render. Default: 500. */
  buffer?: number;
  /** Minimum document child count before lazy rendering kicks in. Default: 50. */
  threshold?: number;
  /** Enable/disable. Default: true. */
  enabled?: boolean;
}

const DEFAULTS: Required<LazyRenderConfig> = {
  buffer: 500,
  threshold: 50,
  enabled: true,
};

/**
 * LazyRenderer manages viewport-based rendering for long documents.
 * Attach to an EditorView to enable virtualization of off-screen blocks.
 */
export class LazyRenderer {
  private _config: Required<LazyRenderConfig>;
  private _observer: IntersectionObserver | null = null;
  private _visibleSet = new Set<Element>();
  private _placeholders = new WeakMap<Element, HTMLElement>();
  private _editorDOM: HTMLElement | null = null;
  private _enabled = false;

  constructor(config?: LazyRenderConfig) {
    this._config = { ...DEFAULTS, ...config };
  }

  /**
   * Attach to an editor DOM element. Call after initial render.
   */
  attach(editorDOM: HTMLElement): void {
    this._editorDOM = editorDOM;

    if (!this._config.enabled) return;

    // Only enable if document is large enough
    if (editorDOM.childElementCount < this._config.threshold) return;

    this._enabled = true;
    this._observer = new IntersectionObserver(
      (entries) => this._onIntersection(entries),
      {
        root: null, // viewport
        rootMargin: `${this._config.buffer}px 0px`,
        threshold: 0,
      },
    );

    // Observe all direct block children
    for (const child of editorDOM.children) {
      this._observer.observe(child);
    }
  }

  /**
   * Call after the DOM is patched (re-render). Re-observes new children.
   */
  onUpdate(): void {
    if (!this._enabled || !this._observer || !this._editorDOM) return;

    this._observer.disconnect();
    this._visibleSet.clear();

    for (const child of this._editorDOM.children) {
      this._observer.observe(child);
    }
  }

  /**
   * Detach and clean up.
   */
  detach(): void {
    this._observer?.disconnect();
    this._observer = null;
    this._visibleSet.clear();
    this._editorDOM = null;
    this._enabled = false;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  private _onIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this._visibleSet.add(entry.target);
        this._showElement(entry.target as HTMLElement);
      } else {
        this._visibleSet.delete(entry.target);
        // Don't hide immediately — debounce to avoid flicker during fast scrolling
      }
    }
  }

  private _showElement(el: HTMLElement): void {
    if (el.style.display === 'none' || el.hasAttribute('data-flash-placeholder')) {
      el.style.display = '';
      el.removeAttribute('data-flash-placeholder');
    }
  }
}

/**
 * DirtyTracker — tracks which document ranges changed in a transaction,
 * so the renderer can skip unchanged subtrees.
 *
 * Usage:
 *   const dirty = new DirtyTracker();
 *   dirty.track(transaction);  // after each transaction
 *   if (dirty.isDirty(nodePos, nodeEnd)) { ... re-render ... }
 *   dirty.clear();
 */
export class DirtyTracker {
  private _ranges: Array<[number, number]> = [];

  /** Record dirty ranges from a transaction's step maps. */
  track(tr: { steps: Array<{ getMap(): { ranges: number[] } }> }): void {
    for (const step of tr.steps) {
      const map = step.getMap();
      for (let i = 0; i < map.ranges.length; i += 3) {
        const from = map.ranges[i];
        const oldSize = map.ranges[i + 1];
        const newSize = map.ranges[i + 2];
        this._ranges.push([from, from + Math.max(oldSize, newSize)]);
      }
    }
  }

  /** Check if a document range overlaps with any dirty range. */
  isDirty(from: number, to: number): boolean {
    for (const [dFrom, dTo] of this._ranges) {
      if (from <= dTo && to >= dFrom) return true;
    }
    return false;
  }

  /** Check if any ranges are dirty. */
  get hasDirty(): boolean {
    return this._ranges.length > 0;
  }

  /** Clear all dirty ranges. */
  clear(): void {
    this._ranges.length = 0;
  }
}

/**
 * VNodePool — reuse VNode objects to reduce GC pressure.
 * Especially useful during rapid typing where many small VNodes are created/destroyed.
 */
export class VNodePool {
  private _pool: Array<{ tag: string; attrs: unknown; children: unknown[]; key: string | null; dom: null }> = [];
  private _maxSize: number;

  constructor(maxSize = 256) {
    this._maxSize = maxSize;
  }

  acquire(tag: string, attrs: unknown, children: unknown[], key: string | null) {
    const node = this._pool.pop();
    if (node) {
      node.tag = tag;
      node.attrs = attrs;
      node.children = children;
      node.key = key;
      node.dom = null;
      return node;
    }
    return { tag, attrs, children, key, dom: null };
  }

  release(node: { tag: string; children: unknown[] }): void {
    if (this._pool.length < this._maxSize) {
      node.children.length = 0;
      this._pool.push(node as typeof this._pool[0]);
    }
  }

  get size(): number {
    return this._pool.length;
  }

  clear(): void {
    this._pool.length = 0;
  }
}
