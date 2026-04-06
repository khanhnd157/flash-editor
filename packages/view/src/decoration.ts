import type { Mapping } from '@flash/transform';
import type { VNodeAttrs } from './vnode';

/**
 * Decoration types:
 * - Inline: wraps a range of inline content (e.g., search highlight)
 * - Widget: inserts a DOM element at a position (e.g., cursor, placeholder)
 * - Node: applies attributes/class to a node's DOM element
 */

export interface InlineDecoration {
  type: 'inline';
  from: number;
  to: number;
  attrs: VNodeAttrs;
}

export interface WidgetDecoration {
  type: 'widget';
  pos: number;
  toDOM: () => globalThis.Node;
  side: number; // negative = before content, positive = after
  key?: string;
}

export interface NodeDecoration {
  type: 'node';
  from: number;
  to: number;
  attrs: VNodeAttrs;
}

export type Decoration = InlineDecoration | WidgetDecoration | NodeDecoration;

export interface DecorationSource {
  find(from?: number, to?: number): Decoration[];
  map(mapping: Mapping): DecorationSource;
}

/**
 * DecorationSet — stores decorations sorted by position for efficient lookup.
 * Maps through transactions to keep positions valid.
 */
export class DecorationSet implements DecorationSource {
  private constructor(private decorations: Decoration[]) {}

  find(from?: number, to?: number): Decoration[] {
    if (from === undefined && to === undefined) return this.decorations;
    return this.decorations.filter((d) => {
      const dFrom = d.type === 'widget' ? d.pos : d.from;
      const dTo = d.type === 'widget' ? d.pos : d.to;
      if (from !== undefined && dTo < from) return false;
      if (to !== undefined && dFrom > to) return false;
      return true;
    });
  }

  map(mapping: Mapping): DecorationSet {
    const mapped: Decoration[] = [];
    for (const d of this.decorations) {
      if (d.type === 'widget') {
        const result = mapping.mapResult(d.pos, d.side);
        if (!result.deleted) {
          mapped.push({ ...d, pos: result.pos });
        }
      } else {
        const from = mapping.map(d.from, 1);
        const to = mapping.map(d.to, -1);
        if (from < to) {
          mapped.push({ ...d, from, to });
        }
        // Collapsed decorations (from >= to) are dropped
      }
    }
    return new DecorationSet(mapped);
  }

  add(decorations: Decoration[]): DecorationSet {
    const all = [...this.decorations, ...decorations];
    all.sort(decoCompare);
    return new DecorationSet(all);
  }

  remove(decorations: Decoration[]): DecorationSet {
    const removeSet = new Set(decorations);
    return new DecorationSet(this.decorations.filter((d) => !removeSet.has(d)));
  }

  get size(): number {
    return this.decorations.length;
  }

  static create(decorations: Decoration[]): DecorationSet {
    const sorted = [...decorations].sort(decoCompare);
    return new DecorationSet(sorted);
  }

  static empty = new DecorationSet([]);
}

function decoCompare(a: Decoration, b: Decoration): number {
  const aFrom = a.type === 'widget' ? a.pos : a.from;
  const bFrom = b.type === 'widget' ? b.pos : b.from;
  return aFrom - bFrom;
}

// Convenience constructors
export function inline(from: number, to: number, attrs: VNodeAttrs): InlineDecoration {
  return { type: 'inline', from, to, attrs };
}

export function widget(pos: number, toDOM: () => globalThis.Node, options?: { side?: number; key?: string }): WidgetDecoration {
  return { type: 'widget', pos, toDOM, side: options?.side ?? 0, key: options?.key };
}

export function nodeDecoration(from: number, to: number, attrs: VNodeAttrs): NodeDecoration {
  return { type: 'node', from, to, attrs };
}
