# Architecture

## Package Structure

Flash is organized as a monorepo with focused, tree-shakeable packages:

| Package | Size (gzip) | Description |
|---|---|---|
| `@flash/model` | ~5KB | Document model: Node, Fragment, Mark, Schema, Position |
| `@flash/transform` | ~3KB | Step-based document transforms with invertibility |
| `@flash/state` | ~3KB | Immutable EditorState, Transaction, Selection, Plugin |
| `@flash/view` | ~8KB | Virtual DOM, diff/patch, EditorView, input handling |
| `@flash/core` | ~4KB | Editor class, Extension system |
| `@flash/commands` | ~2KB | Built-in command helpers |
| `@flash/i18n` | ~1KB | Locale registry, t() function |
| `@flash/starter-kit` | ~25KB | All standard extensions bundled |
| `@flash/ui` | ~15KB | Toolbar, BubbleMenu, FloatingMenu, SlashCommand |

## Data Flow

```
User Input → InputHandler → Transaction → EditorState.apply()
                                               ↓
                                          New EditorState
                                               ↓
                                    EditorView.updateState()
                                               ↓
                               renderDoc() → VNode tree
                                               ↓
                                  diff(old, new) → patches
                                               ↓
                                    patch(DOM, patches)
```

## Design Decisions

1. **No ProseMirror dependency** — Full custom document model for complete control over size and API design
2. **Custom virtual DOM** — Optimized for rich text (mark-aware diffing, reference equality skip for immutable nodes)
3. **Headless first** — Core has zero DOM framework dependency; adapters are thin wrappers
4. **Extension-per-package** — Maximum tree-shaking; only pay for what you use
5. **Collab-deferred** — Architecture supports OT/CRDT but no implementation in v1
6. **Step invertibility** — Every document mutation can be inverted, enabling undo and future collaboration
