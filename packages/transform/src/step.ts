import type { Node } from '@flash/model';
import { Fragment, Slice, Mark } from '@flash/model';
import { StepMap, Mapping } from './map';

export interface StepResult {
  doc: Node | null;
  failed: string | null;
}

export function stepResultOk(doc: Node): StepResult {
  return { doc, failed: null };
}

export function stepResultFail(message: string): StepResult {
  return { doc: null, failed: message };
}

export abstract class Step {
  abstract apply(doc: Node): StepResult;
  abstract invert(doc: Node): Step;
  abstract map(mapping: Mapping): Step | null;
  abstract getMap(): StepMap;

  abstract toJSON(): Record<string, unknown>;
}

export class ReplaceStep extends Step {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly slice: Slice,
    readonly structure: boolean = false,
  ) {
    super();
  }

  apply(doc: Node): StepResult {
    try {
      const result = doc.replace(this.from, this.to, this.slice);
      return stepResultOk(result);
    } catch (e) {
      return stepResultFail((e as Error).message);
    }
  }

  invert(doc: Node): Step {
    const oldSlice = doc.slice(this.from, this.to);
    return new ReplaceStep(this.from, this.from + this.slice.size, oldSlice);
  }

  map(mapping: Mapping): Step | null {
    const from = mapping.mapResult(this.from, 1);
    const to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted) return null;
    return new ReplaceStep(
      from.pos,
      Math.max(from.pos, to.pos),
      this.slice,
      this.structure,
    );
  }

  getMap(): StepMap {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }

  toJSON(): Record<string, unknown> {
    return {
      stepType: 'replace',
      from: this.from,
      to: this.to,
      slice: this.slice.toJSON(),
    };
  }
}

export class AddMarkStep extends Step {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly mark: Mark,
  ) {
    super();
  }

  apply(doc: Node): StepResult {
    const oldSlice = doc.slice(this.from, this.to);
    const newContent: Node[] = [];

    oldSlice.content.forEach((node) => {
      if (node.isText) {
        newContent.push(node.mark(this.mark.addToSet(node.marks)));
      } else {
        newContent.push(node);
      }
    });

    const newSlice = new Slice(Fragment.from(newContent), oldSlice.openStart, oldSlice.openEnd);
    try {
      return stepResultOk(doc.replace(this.from, this.to, newSlice));
    } catch (e) {
      return stepResultFail((e as Error).message);
    }
  }

  invert(_doc: Node): Step {
    return new RemoveMarkStep(this.from, this.to, this.mark);
  }

  map(mapping: Mapping): Step | null {
    const from = mapping.map(this.from, 1);
    const to = mapping.map(this.to, -1);
    if (from >= to) return null;
    return new AddMarkStep(from, to, this.mark);
  }

  getMap(): StepMap {
    return StepMap.empty;
  }

  toJSON(): Record<string, unknown> {
    return {
      stepType: 'addMark',
      from: this.from,
      to: this.to,
      mark: this.mark.toJSON(),
    };
  }
}

export class RemoveMarkStep extends Step {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly mark: Mark,
  ) {
    super();
  }

  apply(doc: Node): StepResult {
    const oldSlice = doc.slice(this.from, this.to);
    const newContent: Node[] = [];

    oldSlice.content.forEach((node) => {
      if (node.isText) {
        newContent.push(node.mark(this.mark.removeFromSet(node.marks)));
      } else {
        newContent.push(node);
      }
    });

    const newSlice = new Slice(Fragment.from(newContent), oldSlice.openStart, oldSlice.openEnd);
    try {
      return stepResultOk(doc.replace(this.from, this.to, newSlice));
    } catch (e) {
      return stepResultFail((e as Error).message);
    }
  }

  invert(_doc: Node): Step {
    return new AddMarkStep(this.from, this.to, this.mark);
  }

  map(mapping: Mapping): Step | null {
    const from = mapping.map(this.from, 1);
    const to = mapping.map(this.to, -1);
    if (from >= to) return null;
    return new RemoveMarkStep(from, to, this.mark);
  }

  getMap(): StepMap {
    return StepMap.empty;
  }

  toJSON(): Record<string, unknown> {
    return {
      stepType: 'removeMark',
      from: this.from,
      to: this.to,
      mark: this.mark.toJSON(),
    };
  }
}
