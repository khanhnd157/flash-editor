import type { Node, Mark } from '@flash/model';
import { Transform } from '@flash/transform';
import type { Selection } from './selection';

export class Transaction extends Transform {
  private _selection: Selection | null = null;
  private _storedMarks: readonly Mark[] | null = null;
  private _meta: Map<string, unknown> = new Map();
  private _scrollIntoView = false;
  readonly time: number;

  constructor(state: { doc: Node; selection: Selection; storedMarks: readonly Mark[] | null }) {
    super(state.doc);
    this._selection = state.selection;
    this._storedMarks = state.storedMarks;
    this.time = Date.now();
  }

  get selection(): Selection {
    return this._selection!;
  }

  get selectionSet(): boolean {
    return this._selection !== null;
  }

  get storedMarks(): readonly Mark[] | null {
    return this._storedMarks;
  }

  get scrolledIntoView(): boolean {
    return this._scrollIntoView;
  }

  setSelection(selection: Selection): this {
    this._selection = selection;
    this._storedMarks = null;
    return this;
  }

  setStoredMarks(marks: readonly Mark[] | null): this {
    this._storedMarks = marks;
    return this;
  }

  ensureMarks(marks: readonly Mark[]): this {
    if (!Mark.sameSet(this._storedMarks ?? [], marks)) {
      this._storedMarks = marks;
    }
    return this;
  }

  setMeta(key: string | { toString(): string }, value: unknown): this {
    this._meta.set(String(key), value);
    return this;
  }

  getMeta(key: string | { toString(): string }): unknown {
    return this._meta.get(String(key));
  }

  scrollIntoView(): this {
    this._scrollIntoView = true;
    return this;
  }
}
