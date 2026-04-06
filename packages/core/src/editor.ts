import { Schema } from '@flash/model';
import type { SchemaSpec, NodeSpec, MarkSpec } from '@flash/model';
import { EditorState } from '@flash/state';
import type { Transaction, EditorStateCreateConfig } from '@flash/state';
import { Extension, NodeExtension, MarkExtension } from './extension';
import type { Command } from './extension';

export interface EditorConfig {
  element?: HTMLElement;
  extensions?: Extension[];
  content?: string | Record<string, unknown>;
  autofocus?: boolean;
  editable?: boolean;
  onUpdate?: (editor: Editor) => void;
  onTransaction?: (props: { editor: Editor; transaction: Transaction }) => void;
  onCreate?: (editor: Editor) => void;
  onDestroy?: (editor: Editor) => void;
}

export class Editor {
  readonly schema: Schema;
  private _state: EditorState;
  private _extensions: Extension[];
  private _commands: Map<string, (...args: unknown[]) => Command> = new Map();
  private _keymap: Map<string, Command> = new Map();
  private _config: EditorConfig;
  private _destroyed = false;

  constructor(config: EditorConfig = {}) {
    this._config = config;
    this._extensions = this.sortExtensions(config.extensions ?? []);

    // Build schema from extensions
    this.schema = this.buildSchema();

    // Build initial state
    const stateConfig: EditorStateCreateConfig = {
      schema: this.schema,
      plugins: this.collectPlugins(),
    };
    this._state = EditorState.create(stateConfig);

    // Collect commands and keymap
    this.collectCommands();
    this.collectKeymap();

    // Notify extensions
    for (const ext of this._extensions) {
      ext.config.onCreate?.(this);
    }

    config.onCreate?.(this);
  }

  get state(): EditorState {
    return this._state;
  }

  get extensions(): readonly Extension[] {
    return this._extensions;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  dispatch(tr: Transaction): void {
    const { state, transactions } = this._state.applyTransaction(tr);
    this._state = state;

    for (const t of transactions) {
      this._config.onTransaction?.({ editor: this, transaction: t });
    }

    if (tr.docChanged) {
      for (const ext of this._extensions) {
        ext.config.onUpdate?.(this);
      }
      this._config.onUpdate?.(this);
    }
  }

  // Command system
  command(name: string, ...args: unknown[]): boolean {
    const cmd = this._commands.get(name);
    if (!cmd) return false;
    return cmd(...args)(this._state, (tr) => this.dispatch(tr));
  }

  can(): CanChecker {
    return new CanChecker(this);
  }

  chain(): CommandChain {
    return new CommandChain(this);
  }

  getCommand(name: string): ((...args: unknown[]) => Command) | undefined {
    return this._commands.get(name);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const ext of this._extensions) {
      ext.config.onDestroy?.(this);
    }
    this._config.onDestroy?.(this);
  }

  // ---- Private ----

  private buildSchema(): Schema {
    const nodes: Record<string, NodeSpec> = {};
    const marks: Record<string, MarkSpec> = {};

    // Always include doc, text, paragraph as minimum
    nodes['doc'] = { content: 'block+' };
    nodes['text'] = { group: 'inline' };
    nodes['paragraph'] = { content: 'inline*', group: 'block' };

    for (const ext of this._extensions) {
      if (ext instanceof NodeExtension) {
        nodes[ext.name] = ext.getNodeSpec();
      } else if (ext instanceof MarkExtension) {
        marks[ext.name] = ext.getMarkSpec();
      }
    }

    return new Schema({ nodes, marks });
  }

  private collectPlugins(): import('@flash/state').Plugin[] {
    const plugins: import('@flash/state').Plugin[] = [];
    for (const ext of this._extensions) {
      if (ext.config.addPlugins) {
        plugins.push(...ext.config.addPlugins());
      }
    }
    return plugins;
  }

  private collectCommands(): void {
    for (const ext of this._extensions) {
      if (ext.config.addCommands) {
        const cmds = ext.config.addCommands();
        for (const [name, cmd] of Object.entries(cmds)) {
          this._commands.set(name, cmd);
        }
      }
    }
  }

  private collectKeymap(): void {
    for (const ext of this._extensions) {
      if (ext.config.addKeyboardShortcuts) {
        const shortcuts = ext.config.addKeyboardShortcuts();
        for (const [key, cmd] of Object.entries(shortcuts)) {
          this._keymap.set(key, cmd);
        }
      }
    }
  }

  private sortExtensions(extensions: Extension[]): Extension[] {
    return [...extensions].sort((a, b) => b.priority - a.priority);
  }
}

class CanChecker {
  constructor(private readonly editor: Editor) {}

  command(name: string, ...args: unknown[]): boolean {
    const cmd = this.editor.getCommand(name);
    if (!cmd) return false;
    // Dry run — no dispatch
    return cmd(...args)(this.editor.state);
  }
}

class CommandChain {
  private readonly commands: Array<(tr: Transaction) => Transaction | null> = [];

  constructor(private readonly editor: Editor) {}

  command(name: string, ...args: unknown[]): this {
    this.commands.push((tr) => {
      const cmd = this.editor.getCommand(name);
      if (!cmd) return null;
      let result: Transaction | null = null;
      cmd(...args)(this.editor.state, (t) => {
        result = t;
      });
      return result ?? tr;
    });
    return this;
  }

  run(): boolean {
    let tr = this.editor.state.tr;
    for (const cmd of this.commands) {
      const result = cmd(tr);
      if (!result) return false;
      tr = result;
    }
    this.editor.dispatch(tr);
    return true;
  }
}
