# API Reference — @flash/core

## Editor

The main entry point. Creates and manages an editor instance.

```typescript
import { Editor } from '@flash/core';
```

### Constructor

```typescript
new Editor(config?: EditorConfig)
```

### EditorConfig

| Property | Type | Description |
|---|---|---|
| `element` | `HTMLElement` | DOM element to mount the editor into |
| `extensions` | `Extension[]` | Extensions to load |
| `content` | `string \| object` | Initial content (HTML string or JSON) |
| `autofocus` | `boolean` | Auto-focus on creation |
| `editable` | `boolean` | Enable/disable editing |
| `i18n` | `EditorI18nConfig` | i18n configuration |
| `onUpdate` | `(editor) => void` | Called when document changes |
| `onTransaction` | `(props) => void` | Called on every transaction |
| `onCreate` | `(editor) => void` | Called after creation |
| `onDestroy` | `(editor) => void` | Called on destroy |

### Properties

| Property | Type | Description |
|---|---|---|
| `state` | `EditorState` | Current editor state (read-only) |
| `schema` | `Schema` | Document schema |
| `extensions` | `Extension[]` | Loaded extensions |
| `isDestroyed` | `boolean` | Whether editor is destroyed |
| `locale` | `string` | Current locale |

### Methods

| Method | Returns | Description |
|---|---|---|
| `command(name, ...args)` | `boolean` | Execute a named command |
| `can().command(name)` | `boolean` | Dry-run check if command can execute |
| `chain().command(name).run()` | `boolean` | Chain multiple commands |
| `dispatch(tr)` | `void` | Apply a transaction |
| `t(key, params?)` | `string` | Translate a key |
| `setLocale(locale)` | `void` | Change active locale |
| `destroy()` | `void` | Destroy the editor |

## Extension

Base class for all extensions.

```typescript
import { Extension, NodeExtension, MarkExtension } from '@flash/core';
```

### Creating Extensions

```typescript
const MyExtension = Extension.create({
  name: 'myExtension',
  addCommands: () => ({
    myCommand: () => (state, dispatch) => { /* ... */ },
  }),
  addKeyboardShortcuts: () => ({
    'Mod-k': (state, dispatch) => { /* ... */ },
  }),
});
```

See the [Extensions guide](/guide/extensions) for details.
