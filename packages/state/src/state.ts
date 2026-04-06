import type { Node, Mark, Schema } from '@flash/model';
import { Selection, TextSelection } from './selection';
import { Transaction } from './transaction';
import { Plugin } from './plugin';
import type { EditorStateConfig } from './plugin';

export interface EditorStateCreateConfig {
  schema?: Schema;
  doc?: Node;
  selection?: Selection;
  storedMarks?: readonly Mark[] | null;
  plugins?: Plugin[];
}

export class EditorState {
  readonly doc: Node;
  readonly selection: Selection;
  readonly storedMarks: readonly Mark[] | null;
  readonly schema: Schema;
  readonly plugins: readonly Plugin[];
  readonly pluginStates: Map<string, unknown>;

  private constructor(config: {
    doc: Node;
    selection: Selection;
    storedMarks: readonly Mark[] | null;
    schema: Schema;
    plugins: readonly Plugin[];
    pluginStates: Map<string, unknown>;
  }) {
    this.doc = config.doc;
    this.selection = config.selection;
    this.storedMarks = config.storedMarks;
    this.schema = config.schema;
    this.plugins = config.plugins;
    this.pluginStates = config.pluginStates;
  }

  get tr(): Transaction {
    return new Transaction(this);
  }

  apply(tr: Transaction): EditorState {
    return this.applyTransaction(tr).state;
  }

  applyTransaction(rootTr: Transaction): { state: EditorState; transactions: Transaction[] } {
    // Filter transaction through plugins
    for (const plugin of this.plugins) {
      if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction(rootTr, this)) {
        return { state: this, transactions: [] };
      }
    }

    const transactions = [rootTr];
    let newState = this.applyInner(rootTr);

    // Allow plugins to append transactions
    for (let i = 0; i < 10; i++) { // max 10 append rounds
      let appended = false;
      for (const plugin of this.plugins) {
        if (plugin.spec.appendTransaction) {
          const append = plugin.spec.appendTransaction(transactions, this, newState);
          if (append) {
            transactions.push(append);
            newState = newState.applyInner(append);
            appended = true;
          }
        }
      }
      if (!appended) break;
    }

    return { state: newState, transactions };
  }

  private applyInner(tr: Transaction): EditorState {
    const doc = tr.doc;
    const selection = tr.selectionSet
      ? tr.selection
      : this.selection.map(doc, tr.mapping);
    const storedMarks = tr.storedMarks;

    // Update plugin states
    const pluginStates = new Map<string, unknown>();
    for (const plugin of this.plugins) {
      if (plugin.spec.state) {
        const oldValue = this.pluginStates.get(plugin.key);
        const newValue = plugin.spec.state.apply(tr, oldValue, this, undefined as unknown as EditorState);
        pluginStates.set(plugin.key, newValue);
      }
    }

    return new EditorState({
      doc,
      selection,
      storedMarks,
      schema: this.schema,
      plugins: this.plugins,
      pluginStates,
    });
  }

  reconfigure(config: { plugins?: Plugin[] }): EditorState {
    const plugins = config.plugins ?? this.plugins;
    const pluginStates = new Map<string, unknown>();
    const stateConfig: EditorStateConfig = { doc: this.doc, plugins: [...plugins] };

    for (const plugin of plugins) {
      if (plugin.spec.state) {
        const oldValue = this.pluginStates.get(plugin.key);
        if (oldValue !== undefined) {
          pluginStates.set(plugin.key, oldValue);
        } else {
          pluginStates.set(plugin.key, plugin.spec.state.init(stateConfig, this));
        }
      }
    }

    return new EditorState({
      doc: this.doc,
      selection: this.selection,
      storedMarks: this.storedMarks,
      schema: this.schema,
      plugins,
      pluginStates,
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      doc: this.doc.toJSON(),
      selection: this.selection.toJSON(),
    };
  }

  static create(config: EditorStateCreateConfig): EditorState {
    let doc: Node;
    let schema: Schema;

    if (config.doc) {
      doc = config.doc;
      schema = doc.type.schema;
    } else if (config.schema) {
      schema = config.schema;
      const topType = schema.topNodeType;
      doc = topType.createAndFill()!;
      if (!doc) throw new Error('Could not create initial document');
    } else {
      throw new Error('EditorState.create requires either doc or schema');
    }

    const plugins = config.plugins ?? [];
    const selection = config.selection ?? TextSelection.atStart(doc);
    const storedMarks = config.storedMarks ?? null;

    // Initialize plugin states
    const pluginStates = new Map<string, unknown>();
    const stateConfig: EditorStateConfig = { doc, plugins };

    const state = new EditorState({
      doc,
      selection,
      storedMarks,
      schema,
      plugins,
      pluginStates,
    });

    for (const plugin of plugins) {
      if (plugin.spec.state) {
        pluginStates.set(plugin.key, plugin.spec.state.init(stateConfig, state));
      }
    }

    return state;
  }
}
