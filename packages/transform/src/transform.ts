import type { Node, Slice, MarkType } from '@flash/model';
import { Fragment, Mark } from '@flash/model';
import { Slice as SliceCls } from '@flash/model';
import { Step, ReplaceStep, AddMarkStep, RemoveMarkStep } from './step';
import type { StepResult } from './step';
import { Mapping, StepMap } from './map';

export class Transform {
  readonly steps: Step[] = [];
  readonly docs: Node[] = [];
  readonly mapping: Mapping = new Mapping();
  doc: Node;

  constructor(doc: Node) {
    this.doc = doc;
  }

  get docChanged(): boolean {
    return this.steps.length > 0;
  }

  get before(): Node {
    return this.docs.length > 0 ? this.docs[0] : this.doc;
  }

  step(step: Step): this {
    const result = this.maybeStep(step);
    if (result.failed) {
      throw new Error(`Failed to apply step: ${result.failed}`);
    }
    return this;
  }

  maybeStep(step: Step): StepResult {
    const result = step.apply(this.doc);
    if (!result.failed && result.doc) {
      this.addStep(step, result.doc);
    }
    return result;
  }

  private addStep(step: Step, doc: Node): void {
    this.docs.push(this.doc);
    this.steps.push(step);
    this.mapping.appendMap(step.getMap());
    this.doc = doc;
  }

  // ---- Convenience methods ----

  replace(from: number, to: number = from, slice: Slice = SliceCls.empty): this {
    return this.step(new ReplaceStep(from, to, slice));
  }

  replaceWith(from: number, to: number, content: Fragment | Node | readonly Node[]): this {
    return this.replace(from, to, new SliceCls(Fragment.from(content), 0, 0));
  }

  delete(from: number, to: number): this {
    return this.replace(from, to);
  }

  insert(pos: number, content: Fragment | Node | readonly Node[]): this {
    return this.replaceWith(pos, pos, content);
  }

  insertText(pos: number, text: string): this {
    const schema = this.doc.type.schema;
    return this.replaceWith(pos, pos, schema.text(text));
  }

  addMark(from: number, to: number, mark: Mark): this {
    return this.step(new AddMarkStep(from, to, mark));
  }

  removeMark(from: number, to: number, mark: Mark | MarkType): this {
    const markObj = mark instanceof Mark
      ? mark
      : undefined;

    if (markObj) {
      return this.step(new RemoveMarkStep(from, to, markObj));
    }

    // If mark is a MarkType, find and remove all marks of that type
    const markType = mark as MarkType;
    let found = false;
    this.doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        const m = markType.isInSet(node.marks);
        if (m) {
          this.step(new RemoveMarkStep(from, to, m));
          found = true;
        }
      }
    });
    void found;
    return this;
  }

  clearIncompatible(pos: number, parentType: import('@flash/model').NodeType): this {
    const match = parentType.contentMatch;
    const node = this.doc.resolve(pos).node();
    const delSteps: { from: number; to: number }[] = [];

    let cur = match;
    let offset = 0;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      const end = offset + child.nodeSize;
      const next = cur.matchType(child.type);
      if (!next) {
        delSteps.push({ from: pos + offset + 1, to: pos + end + 1 });
      } else {
        cur = next;
      }
      offset = end;
    }

    // Apply deletions in reverse order to preserve positions
    for (let i = delSteps.length - 1; i >= 0; i--) {
      this.delete(delSteps[i].from, delSteps[i].to);
    }
    return this;
  }
}
