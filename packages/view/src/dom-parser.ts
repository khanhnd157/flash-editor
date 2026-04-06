import type { Schema, NodeType, MarkType, Node as DocNode, Mark } from '@flash/model';
import { Fragment } from '@flash/model';
import { Mark as MarkClass } from '@flash/model';

interface ParseRuleEntry {
  tag?: string;
  style?: string;
  priority: number;
  nodeType?: NodeType;
  markType?: MarkType;
  getAttrs?: (dom: HTMLElement | string) => Record<string, unknown> | false | null;
}

/**
 * DOMParser — parses HTML DOM into Flash document model.
 * Schema-driven: uses parseDOM rules from NodeSpec/MarkSpec.
 */
export class FlashDOMParser {
  private nodeRules: ParseRuleEntry[] = [];
  private markRules: ParseRuleEntry[] = [];

  constructor(readonly schema: Schema) {
    this.buildRules();
  }

  private buildRules(): void {
    // Collect node rules
    for (const [name, nodeType] of Object.entries(this.schema.nodes)) {
      const spec = nodeType.spec;
      if (spec.parseDOM) {
        for (const rule of spec.parseDOM) {
          this.nodeRules.push({
            tag: rule.tag,
            priority: rule.priority ?? 50,
            nodeType,
            getAttrs: rule.getAttrs,
          });
        }
      }
    }

    // Collect mark rules
    for (const [name, markType] of Object.entries(this.schema.marks)) {
      const spec = markType.spec;
      if (spec.parseDOM) {
        for (const rule of spec.parseDOM) {
          this.markRules.push({
            tag: rule.tag,
            style: rule.style,
            priority: rule.priority ?? 50,
            markType,
            getAttrs: rule.getAttrs as ParseRuleEntry['getAttrs'],
          });
        }
      }
    }

    // Sort by priority (lower = first)
    this.nodeRules.sort((a, b) => a.priority - b.priority);
    this.markRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Parse an HTML string into a document node.
   */
  parseHTML(html: string): DocNode {
    const template = document.createElement('template');
    template.innerHTML = html;
    return this.parseDOMNode(template.content);
  }

  /**
   * Parse a DOM node into a document node.
   */
  parseDOMNode(dom: globalThis.Node): DocNode {
    const topType = this.schema.topNodeType;
    const children = this.parseChildren(dom, MarkClass.none);
    const content = Fragment.from(children);
    return topType.createAndFill(undefined, content) ?? topType.create(undefined, content);
  }

  private parseChildren(parent: globalThis.Node, activeMarks: readonly Mark[]): DocNode[] {
    const result: DocNode[] = [];

    for (let i = 0; i < parent.childNodes.length; i++) {
      const dom = parent.childNodes[i];
      const nodes = this.parseDOMChild(dom, activeMarks);
      result.push(...nodes);
    }

    return result;
  }

  private parseDOMChild(dom: globalThis.Node, activeMarks: readonly Mark[]): DocNode[] {
    // Text node
    if (dom.nodeType === 3) {
      const text = dom.textContent;
      if (!text || /^\s*$/.test(text)) {
        // Normalize whitespace-only text
        const normalized = text?.replace(/\s+/g, ' ');
        if (normalized && normalized !== ' ') {
          return [this.schema.text(normalized, activeMarks)];
        }
        if (normalized === ' ') {
          return [this.schema.text(' ', activeMarks)];
        }
        return [];
      }
      return [this.schema.text(text, activeMarks)];
    }

    // Element node
    if (dom.nodeType !== 1) return [];
    const el = dom as HTMLElement;

    // Skip script/style
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style') return [];

    // Check mark rules first — marks wrap children
    for (const rule of this.markRules) {
      if (rule.tag && el.matches(rule.tag)) {
        const attrs = rule.getAttrs?.(el);
        if (attrs === false) continue;
        const mark = rule.markType!.create(attrs ?? undefined);
        const newMarks = mark.addToSet([...activeMarks]);
        return this.parseChildren(el, newMarks);
      }
    }

    // Check node rules
    for (const rule of this.nodeRules) {
      if (rule.tag && el.matches(rule.tag)) {
        const attrs = rule.getAttrs?.(el);
        if (attrs === false) continue;
        const nodeType = rule.nodeType!;

        if (nodeType.isLeaf) {
          return [nodeType.create(attrs ?? undefined)];
        }

        const children = this.parseChildren(el, nodeType.isBlock ? MarkClass.none : activeMarks);
        const content = Fragment.from(children);
        const node = nodeType.createAndFill(attrs ?? undefined, content);
        return node ? [node] : [];
      }
    }

    // Fallback: known HTML tags → standard node types
    const fallback = this.fallbackParse(el, activeMarks);
    if (fallback) return fallback;

    // Unknown element: parse children as inline content
    return this.parseChildren(el, activeMarks);
  }

  private fallbackParse(el: HTMLElement, activeMarks: readonly Mark[]): DocNode[] | null {
    const tag = el.tagName.toLowerCase();

    // Block elements → paragraph
    if (['p', 'div', 'section', 'article', 'main', 'header', 'footer'].includes(tag)) {
      const children = this.parseChildren(el, MarkClass.none);
      const para = this.schema.nodes['paragraph'];
      if (para) {
        const node = para.createAndFill(undefined, Fragment.from(children));
        return node ? [node] : [];
      }
    }

    // Headings
    const headingMatch = /^h(\d)$/.exec(tag);
    if (headingMatch && this.schema.nodes['heading']) {
      const level = parseInt(headingMatch[1], 10);
      const children = this.parseChildren(el, MarkClass.none);
      const node = this.schema.nodes['heading'].createAndFill({ level }, Fragment.from(children));
      return node ? [node] : [];
    }

    // Inline formatting fallbacks
    if (tag === 'strong' || tag === 'b') {
      const markType = this.schema.marks['bold'];
      if (markType) {
        const mark = markType.create();
        return this.parseChildren(el, mark.addToSet([...activeMarks]));
      }
    }
    if (tag === 'em' || tag === 'i') {
      const markType = this.schema.marks['italic'];
      if (markType) {
        const mark = markType.create();
        return this.parseChildren(el, mark.addToSet([...activeMarks]));
      }
    }
    if (tag === 'a') {
      const markType = this.schema.marks['link'];
      if (markType) {
        const href = el.getAttribute('href') ?? '';
        const mark = markType.create({ href });
        return this.parseChildren(el, mark.addToSet([...activeMarks]));
      }
    }
    if (tag === 'code') {
      const markType = this.schema.marks['code'];
      if (markType) {
        const mark = markType.create();
        return this.parseChildren(el, mark.addToSet([...activeMarks]));
      }
    }
    if (tag === 'br') {
      const hb = this.schema.nodes['hard_break'];
      if (hb) return [hb.create()];
    }
    if (tag === 'hr') {
      const hr = this.schema.nodes['horizontal_rule'];
      if (hr) return [hr.create()];
    }
    if (tag === 'blockquote' && this.schema.nodes['blockquote']) {
      const children = this.parseChildren(el, MarkClass.none);
      const node = this.schema.nodes['blockquote'].createAndFill(undefined, Fragment.from(children));
      return node ? [node] : [];
    }
    if (tag === 'ul' && this.schema.nodes['bullet_list']) {
      const children = this.parseChildren(el, MarkClass.none);
      const node = this.schema.nodes['bullet_list'].createAndFill(undefined, Fragment.from(children));
      return node ? [node] : [];
    }
    if (tag === 'ol' && this.schema.nodes['ordered_list']) {
      const children = this.parseChildren(el, MarkClass.none);
      const node = this.schema.nodes['ordered_list'].createAndFill(undefined, Fragment.from(children));
      return node ? [node] : [];
    }
    if (tag === 'li' && this.schema.nodes['list_item']) {
      const children = this.parseChildren(el, MarkClass.none);
      const node = this.schema.nodes['list_item'].createAndFill(undefined, Fragment.from(children));
      return node ? [node] : [];
    }
    if (tag === 'pre' && this.schema.nodes['code_block']) {
      const text = el.textContent ?? '';
      const node = this.schema.nodes['code_block'].createAndFill(undefined,
        text ? Fragment.from([this.schema.text(text)]) : undefined
      );
      return node ? [node] : [];
    }
    if (tag === 'img' && this.schema.nodes['image']) {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return [this.schema.nodes['image'].create({ src, alt })];
    }

    return null;
  }
}

/**
 * DOMSerializer — serializes Flash document model to DOM.
 * Used for clipboard operations and SSR.
 */
export class FlashDOMSerializer {
  constructor(readonly schema: Schema) {}

  serializeFragment(fragment: Fragment, target?: HTMLElement): HTMLElement {
    const container = target ?? document.createElement('div');
    fragment.forEach((node) => {
      container.appendChild(this.serializeNode(node));
    });
    return container;
  }

  serializeNode(node: DocNode): globalThis.Node {
    if (node.isText) {
      return this.serializeTextWithMarks(node);
    }

    const dom = this.nodeToDOM(node);

    if (node.content.childCount > 0) {
      const contentTarget = dom instanceof HTMLElement ? dom : dom;
      node.forEach((child) => {
        contentTarget.appendChild(this.serializeNode(child));
      });
    }

    return dom;
  }

  private nodeToDOM(node: DocNode): globalThis.Element {
    const spec = node.type.spec;

    // Use toDOM if provided
    if (spec.toDOM) {
      const domSpec = spec.toDOM(node);
      return this.domSpecToDOM(domSpec) as globalThis.Element;
    }

    // Fallback mappings
    const tag = this.defaultTag(node);
    const dom = document.createElement(tag);

    if (node.type.name === 'heading') {
      // Tag already accounts for level
    }
    if (node.type.name === 'image') {
      (dom as HTMLImageElement).src = node.attrs.src as string;
      if (node.attrs.alt) (dom as HTMLImageElement).alt = node.attrs.alt as string;
    }

    return dom;
  }

  private defaultTag(node: DocNode): string {
    switch (node.type.name) {
      case 'doc': return 'div';
      case 'paragraph': return 'p';
      case 'heading': return `h${Math.min(6, Math.max(1, (node.attrs.level as number) ?? 1))}`;
      case 'blockquote': return 'blockquote';
      case 'code_block': return 'pre';
      case 'bullet_list': return 'ul';
      case 'ordered_list': return 'ol';
      case 'list_item': return 'li';
      case 'horizontal_rule': return 'hr';
      case 'hard_break': return 'br';
      case 'image': return 'img';
      default: return node.isBlock ? 'div' : 'span';
    }
  }

  private serializeTextWithMarks(node: DocNode): globalThis.Node {
    let dom: globalThis.Node = document.createTextNode(node.text ?? '');

    for (let i = node.marks.length - 1; i >= 0; i--) {
      const mark = node.marks[i];
      const wrapper = this.markToDOM(mark);
      wrapper.appendChild(dom);
      dom = wrapper;
    }

    return dom;
  }

  private markToDOM(mark: Mark): HTMLElement {
    const spec = mark.type.spec;

    if (spec.toDOM) {
      const domSpec = spec.toDOM(mark);
      return this.domSpecToDOM(domSpec) as HTMLElement;
    }

    // Fallback
    const tag = this.defaultMarkTag(mark);
    const dom = document.createElement(tag);

    if (mark.type.name === 'link' && mark.attrs.href) {
      (dom as HTMLAnchorElement).href = mark.attrs.href as string;
      dom.setAttribute('rel', 'noopener noreferrer');
    }

    return dom;
  }

  private defaultMarkTag(mark: Mark): string {
    switch (mark.type.name) {
      case 'bold': return 'strong';
      case 'italic': return 'em';
      case 'strike': return 's';
      case 'underline': return 'u';
      case 'code': return 'code';
      case 'link': return 'a';
      case 'subscript': return 'sub';
      case 'superscript': return 'sup';
      case 'highlight': return 'mark';
      default: return 'span';
    }
  }

  private domSpecToDOM(spec: import('@flash/model').DOMOutputSpec): globalThis.Node {
    if (typeof spec === 'string') {
      return document.createTextNode(spec);
    }

    const [tag, ...rest] = spec;
    const dom = document.createElement(tag);

    let contentHoleIdx = -1;
    for (let i = 0; i < rest.length; i++) {
      const item = rest[i];
      if (item === 0) {
        contentHoleIdx = i;
      } else if (typeof item === 'object' && !Array.isArray(item)) {
        // Attributes
        for (const [key, value] of Object.entries(item)) {
          dom.setAttribute(key, value);
        }
      } else if (Array.isArray(item)) {
        dom.appendChild(this.domSpecToDOM(item as import('@flash/model').DOMOutputSpec));
      }
    }

    return dom;
  }
}
