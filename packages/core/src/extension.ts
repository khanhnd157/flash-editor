import type { Schema, NodeSpec, MarkSpec } from '@flash/model';
import type { Plugin } from '@flash/state';

export type Command = (
  state: import('@flash/state').EditorState,
  dispatch?: (tr: import('@flash/state').Transaction) => void,
) => boolean;

export interface ExtensionConfig {
  name: string;
  priority?: number;
  addOptions?: () => Record<string, unknown>;
  addStorage?: () => Record<string, unknown>;
  addCommands?: () => Record<string, (...args: unknown[]) => Command>;
  addKeyboardShortcuts?: () => Record<string, Command>;
  addInputRules?: () => InputRule[];
  addPlugins?: () => Plugin[];
  onCreate?: (editor: import('./editor').Editor) => void;
  onUpdate?: (editor: import('./editor').Editor) => void;
  onDestroy?: (editor: import('./editor').Editor) => void;
}

export interface NodeExtensionConfig extends ExtensionConfig {
  nodeSpec: () => NodeSpec;
  group?: string;
  content?: string;
  inline?: boolean;
}

export interface MarkExtensionConfig extends ExtensionConfig {
  markSpec: () => MarkSpec;
  group?: string;
  inclusive?: boolean;
}

export interface InputRule {
  match: RegExp;
  handler: (
    state: import('@flash/state').EditorState,
    match: RegExpMatchArray,
    start: number,
    end: number,
  ) => import('@flash/state').Transaction | null;
}

export class Extension {
  readonly name: string;
  readonly priority: number;
  readonly config: ExtensionConfig;
  options: Record<string, unknown>;
  storage: Record<string, unknown>;

  protected constructor(config: ExtensionConfig) {
    this.config = config;
    this.name = config.name;
    this.priority = config.priority ?? 100;
    this.options = config.addOptions?.() ?? {};
    this.storage = config.addStorage?.() ?? {};
  }

  configure(options: Record<string, unknown>): Extension {
    const ext = new Extension(this.config);
    ext.options = { ...ext.options, ...options };
    return ext;
  }

  static create(config: ExtensionConfig): Extension {
    return new Extension(config);
  }
}

export class NodeExtension extends Extension {
  readonly nodeConfig: NodeExtensionConfig;

  protected constructor(config: NodeExtensionConfig) {
    super(config);
    this.nodeConfig = config;
  }

  getNodeSpec(): NodeSpec {
    return this.nodeConfig.nodeSpec();
  }

  static override create(config: NodeExtensionConfig): NodeExtension {
    return new NodeExtension(config);
  }
}

export class MarkExtension extends Extension {
  readonly markConfig: MarkExtensionConfig;

  protected constructor(config: MarkExtensionConfig) {
    super(config);
    this.markConfig = config;
  }

  getMarkSpec(): MarkSpec {
    return this.markConfig.markSpec();
  }

  static override create(config: MarkExtensionConfig): MarkExtension {
    return new MarkExtension(config);
  }
}
