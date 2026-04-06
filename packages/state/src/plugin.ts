import type { Node } from '@flash/model';
import type { EditorState } from './state';
import type { Transaction } from './transaction';

export class PluginKey<T = unknown> {
  private readonly key: string;
  private static counter = 0;

  constructor(name?: string) {
    this.key = name ? `plugin$${name}` : `plugin$${++PluginKey.counter}`;
  }

  get(state: EditorState): T | undefined {
    return state.pluginStates.get(this.key) as T | undefined;
  }

  getState(state: EditorState): T | undefined {
    return this.get(state);
  }

  toString(): string {
    return this.key;
  }
}

export interface PluginStateSpec<T> {
  init: (config: EditorStateConfig, state: EditorState) => T;
  apply: (tr: Transaction, value: T, oldState: EditorState, newState: EditorState) => T;
}

export interface PluginSpec<T = unknown> {
  key?: PluginKey<T>;
  state?: PluginStateSpec<T>;
  props?: PluginProps;
  view?: (state: EditorState) => PluginView;
  filterTransaction?: (tr: Transaction, state: EditorState) => boolean;
  appendTransaction?: (
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState,
  ) => Transaction | null | undefined;
}

export interface PluginProps {
  handleKeyDown?: (state: EditorState, event: KeyboardEvent) => boolean;
  handleKeyPress?: (state: EditorState, event: KeyboardEvent) => boolean;
  handlePaste?: (state: EditorState, event: ClipboardEvent) => boolean;
  handleDrop?: (state: EditorState, event: DragEvent) => boolean;
  handleClick?: (state: EditorState, pos: number, event: MouseEvent) => boolean;
}

export interface PluginView {
  update?: (state: EditorState) => void;
  destroy?: () => void;
}

export interface EditorStateConfig {
  doc: Node;
  plugins?: Plugin[];
}

export class Plugin<T = unknown> {
  readonly spec: PluginSpec<T>;
  readonly key: string;

  constructor(spec: PluginSpec<T>) {
    this.spec = spec;
    this.key = spec.key?.toString() ?? `plugin$${++PluginKey['counter']}`;
  }

  getState(state: EditorState): T | undefined {
    return state.pluginStates.get(this.key) as T | undefined;
  }
}
