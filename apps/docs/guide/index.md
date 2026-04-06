# What is Flash Editor?

Flash is a **lightweight, fast, headless rich-text editor engine** built from scratch in TypeScript. It provides a complete document model, transform system, plugin architecture, and rendering layer — with zero dependency on ProseMirror or any other editor framework.

## Why Flash?

- **Full control**: Custom document model and virtual DOM optimized specifically for rich text editing
- **Small footprint**: Core packages total < 20KB gzipped
- **Headless first**: Works standalone or with React, Vue, Svelte adapters
- **Extension-driven**: Every feature (bold, headings, lists, etc.) is a separate, tree-shakeable extension
- **Collab-ready**: Step-based transform system with invertibility — designed for future OT/CRDT integration

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  @flash/core                     │
│            Editor class + Extension system       │
├────────────┬──────────────┬─────────────────────┤
│ @flash/    │  @flash/     │  @flash/            │
│ model      │  state       │  view               │
│ Node, Mark │  EditorState │  VNode, diff/patch  │
│ Schema     │  Transaction │  EditorView         │
│ Fragment   │  Selection   │  InputHandler       │
│ Position   │  Plugin      │  Decorations        │
├────────────┴──────────────┴─────────────────────┤
│                @flash/transform                  │
│          Step, StepMap, Mapping, Transform       │
└─────────────────────────────────────────────────┘
```

## Quick Example

```typescript
import { Editor } from '@flash/core';
import { StarterKit } from '@flash/starter-kit';

const editor = new Editor({
  element: document.getElementById('editor'),
  extensions: StarterKit(),
  content: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello Flash!' }] }
    ]
  },
});

// Execute commands
editor.command('toggleBold');

// Check state
const json = editor.state.doc.toJSON();
```
