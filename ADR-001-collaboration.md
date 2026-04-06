# ADR-001: Collaboration Architecture

**Status**: Accepted (Design Only — no implementation in v1)
**Date**: 2026-04-06
**Authors**: Flash Editor Team

## Context

Flash Editor needs a clear path to real-time collaboration. The core architecture must not block future collab implementation. This ADR documents the design approach, protocol, and trade-offs.

## Decision

We adopt an **OT (Operational Transformation) first** approach, with the option to integrate **Yjs (CRDT)** as an alternative binding.

## Foundation: Step System

Flash's transform system already provides the building blocks:

```
Step.apply(doc) → StepResult { doc, failed? }
Step.invert(doc) → Step        // invertible
Step.map(mapping) → Step | null // position mapping
Step.toJSON() → object          // serializable
Step.fromJSON(schema, json) → Step
```

### Step Types
- `ReplaceStep(from, to, slice)` — insert/delete/replace content
- `AddMarkStep(from, to, mark)` — apply mark to range
- `RemoveMarkStep(from, to, mark)` — remove mark from range
- `ReplaceAroundStep(from, to, gapFrom, gapTo, slice, insert, structure)` — wrap/unwrap

Each step produces a `StepMap` that maps old positions → new positions. This is the core primitive for OT.

## OT Protocol

### Authority Server

The authority server is the single source of truth. It maintains:
- The current document version number
- The confirmed step history

### WebSocket Messages

```typescript
// Client → Server
interface SendSteps {
  type: 'steps';
  version: number;           // client's base version
  clientID: string;
  steps: StepJSON[];         // steps to apply
  selectionJSON: object;     // cursor for presence
}

// Server → Client (broadcast to all clients)
interface NewSteps {
  type: 'newSteps';
  version: number;           // new version after applying
  steps: StepJSON[];
  clientIDs: string[];       // which client sent each step
}

// Server → Client (rejection)
interface StepsRejected {
  type: 'rejected';
  version: number;           // current server version
  reason: string;
}

// Presence
interface PresenceUpdate {
  type: 'presence';
  clientID: string;
  selection: object;
  user: { name: string; color: string };
}
```

### Rebase Algorithm

When a client receives server steps that conflict with its unconfirmed local steps:

```
1. Receive server steps S₁...Sₙ (from other clients)
2. For each unconfirmed local step Lᵢ:
   a. Map Lᵢ through the server mapping: Lᵢ' = Lᵢ.map(serverMapping)
   b. If Lᵢ' is null (step destroyed by conflict), drop it
   c. Otherwise, keep Lᵢ' as the rebased step
3. Apply server steps to the confirmed state
4. Apply rebased local steps on top
5. Update the editor state
```

```typescript
function rebase(
  confirmedState: EditorState,
  serverSteps: Step[],
  localSteps: Step[],
): { state: EditorState; remainingLocal: Step[] } {
  // Build server mapping
  const serverMapping = new Mapping();
  let state = confirmedState;
  for (const step of serverSteps) {
    const result = step.apply(state.doc);
    if (result.doc) {
      state = state.apply(state.tr.step(step));
      serverMapping.appendMap(step.getMap());
    }
  }

  // Rebase local steps
  const remaining: Step[] = [];
  for (const local of localSteps) {
    const mapped = local.map(serverMapping);
    if (mapped) {
      const result = mapped.apply(state.doc);
      if (result.doc) {
        state = state.apply(state.tr.step(mapped));
        remaining.push(mapped);
        serverMapping.appendMap(mapped.getMap());
      }
    }
    // else: local step was destroyed by conflict, silently drop
  }

  return { state, remainingLocal: remaining };
}
```

### Cursor/Selection Awareness

Each client broadcasts its selection alongside steps. Remote cursors are rendered as decorations:

```typescript
// Remote cursor as a widget decoration
function remoteCursorDecoration(pos: number, user: { name: string; color: string }) {
  return widget(pos, () => {
    const el = document.createElement('span');
    el.className = 'flash-remote-cursor';
    el.style.borderLeft = `2px solid ${user.color}`;
    const label = document.createElement('span');
    label.className = 'flash-remote-cursor-label';
    label.textContent = user.name;
    label.style.backgroundColor = user.color;
    el.appendChild(label);
    return el;
  }, { side: -1, key: `cursor-${user.name}` });
}
```

## CRDT Alternative: Yjs Binding

For projects that prefer CRDT over OT, a Yjs binding is feasible:

```typescript
// Conceptual @flash/yjs package
import * as Y from 'yjs';

class YjsBinding {
  constructor(editor: Editor, ydoc: Y.Doc) {
    // Map Y.XmlFragment ↔ Flash document model
    // Observe Y.Doc changes → apply as Flash transactions
    // Observe Flash transactions → apply as Y.Doc changes
  }
}
```

**Trade-offs**:
- Yjs adds ~15KB gzipped to bundle
- CRDT guarantees eventual consistency without a central authority
- OT has simpler mental model for this architecture since Steps are already OT-shaped

## Design Constraints (Already Met)

| Requirement | Status | How |
|---|---|---|
| Steps are serializable | ✅ | `Step.toJSON()` / `Step.fromJSON()` |
| Steps are invertible | ✅ | `Step.invert(doc)` returns inverse step |
| Steps are mappable | ✅ | `Step.map(mapping)` through position maps |
| Position mapping is composable | ✅ | `Mapping` composes `StepMap` chains |
| Document is immutable | ✅ | `EditorState.apply()` returns new state |
| Selection is serializable | ✅ | `Selection.toJSON()` / `fromJSON()` |

## What's NOT Implemented (Deferred)

1. WebSocket server and client transport
2. Rebase plugin for the editor
3. Remote cursor decoration plugin
4. Yjs binding
5. Conflict resolution UI (e.g., merge conflicts for offline edits)
6. Operational Transform server authority logic
7. Undo with collab awareness (per-client undo tracking)

## Consequences

- Flash v1 ships without collaboration, but the architecture does not block it
- Adding collab later requires a new `@flash/collab` package (~5-8KB) + server component
- The Step-based transform system is the key enabler — any changes to Step signatures must preserve serializability and invertibility
- Schema changes (adding/removing node types) need special handling in a collab context — this is a known hard problem deferred to the collab implementation
