import { Plugin, PluginKey, type PluginSpec } from '@flash/state';
import type { EditorState, Transaction } from '@flash/state';
import type { Step } from '@flash/transform';
import { Mapping } from '@flash/transform';

const historyKey = new PluginKey<HistoryState>('history');

interface HistoryItem {
  /** Steps to undo this change. */
  steps: Step[];
  /** Inverse steps to redo. */
  inverses: Step[];
  /** Mapping at time of creation. */
  map: Mapping;
  /** Selection before this change. */
  selectionJSON: ReturnType<EditorState['selection']['toJSON']>;
}

interface HistoryState {
  done: HistoryItem[];
  undone: HistoryItem[];
  /** Tracks whether last change should be grouped with the next one. */
  prevTime: number;
  prevRanges: number[] | null;
}

interface HistoryConfig {
  /** Max undo depth. Default 100. */
  depth?: number;
  /** Min delay (ms) before a new group is started. Default 500. */
  newGroupDelay?: number;
}

const DEFAULTS: Required<HistoryConfig> = {
  depth: 100,
  newGroupDelay: 500,
};

/**
 * Create a history plugin that adds undo/redo support.
 */
export function history(config?: HistoryConfig): Plugin<HistoryState> {
  const opts = { ...DEFAULTS, ...config };

  return new Plugin<HistoryState>({
    key: historyKey,

    state: {
      init(): HistoryState {
        return { done: [], undone: [], prevTime: 0, prevRanges: null };
      },

      apply(tr: Transaction, value: HistoryState, _oldState: EditorState, _newState: EditorState): HistoryState {
        const meta = tr.getMeta(historyKey);

        // If this is an undo/redo transaction, return the state from meta
        if (meta) return meta as HistoryState;

        // If the transaction has no steps (just selection change), pass through
        if (tr.steps.length === 0) return value;

        // Check if we should append to the previous group
        const now = Date.now();
        const shouldGroup = shouldGroupWith(value, tr, opts.newGroupDelay, now);

        const mapping = new Mapping();
        for (const step of tr.steps) {
          mapping.appendMap(step.getMap());
        }

        const inverses: Step[] = [];
        for (let i = tr.steps.length - 1; i >= 0; i--) {
          const inverse = tr.steps[i].invert(
            i === 0 ? _oldState.doc : tr.docs[i],
          );
          inverses.push(inverse);
        }

        let done: HistoryItem[];

        if (shouldGroup && value.done.length > 0) {
          // Merge with last group
          const last = value.done[value.done.length - 1];
          const merged: HistoryItem = {
            steps: [...last.steps, ...tr.steps],
            inverses: [...inverses, ...last.inverses],
            map: composeMapping(last.map, mapping),
            selectionJSON: last.selectionJSON,
          };
          done = [...value.done.slice(0, -1), merged];
        } else {
          const item: HistoryItem = {
            steps: [...tr.steps],
            inverses,
            map: mapping,
            selectionJSON: _oldState.selection.toJSON(),
          };
          done = [...value.done, item];

          // Trim to max depth
          if (done.length > opts.depth) {
            done = done.slice(done.length - opts.depth);
          }
        }

        // Clear redo stack on new edit
        return {
          done,
          undone: [],
          prevTime: now,
          prevRanges: getRangesForTransaction(tr),
        };
      },
    },

    appendTransaction(trs, _oldState, newState) {
      // No-op here; undo/redo are dispatched via commands
      return undefined;
    },
  });
}

/**
 * Command: undo the last change.
 */
export function undo(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const histState = historyKey.get(state);
  if (!histState || histState.done.length === 0) return false;
  if (!dispatch) return true;

  const item = histState.done[histState.done.length - 1];
  const tr = state.tr;

  // Apply inverse steps
  for (const step of item.inverses) {
    const result = step.apply(tr.doc);
    if (result.doc) {
      tr.step(step);
    }
  }

  // Restore selection — place cursor at start of the affected range
  // A more complete implementation would deserialize from selectionJSON

  const newHistState: HistoryState = {
    done: histState.done.slice(0, -1),
    undone: [
      ...histState.undone,
      {
        steps: item.inverses,
        inverses: item.steps,
        map: item.map,
        selectionJSON: state.selection.toJSON(),
      },
    ],
    prevTime: 0,
    prevRanges: null,
  };

  tr.setMeta(historyKey, newHistState);
  dispatch(tr);
  return true;
}

/**
 * Command: redo the last undone change.
 */
export function redo(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const histState = historyKey.get(state);
  if (!histState || histState.undone.length === 0) return false;
  if (!dispatch) return true;

  const item = histState.undone[histState.undone.length - 1];
  const tr = state.tr;

  // Apply inverse steps (redo)
  for (const step of item.inverses) {
    const result = step.apply(tr.doc);
    if (result.doc) {
      tr.step(step);
    }
  }

  const newHistState: HistoryState = {
    done: [
      ...histState.done,
      {
        steps: item.inverses,
        inverses: item.steps,
        map: item.map,
        selectionJSON: state.selection.toJSON(),
      },
    ],
    undone: histState.undone.slice(0, -1),
    prevTime: 0,
    prevRanges: null,
  };

  tr.setMeta(historyKey, newHistState);
  dispatch(tr);
  return true;
}

/**
 * Check if undo is available.
 */
export function undoDepth(state: EditorState): number {
  return historyKey.get(state)?.done.length ?? 0;
}

/**
 * Check if redo is available.
 */
export function redoDepth(state: EditorState): number {
  return historyKey.get(state)?.undone.length ?? 0;
}

// ---- Internal helpers ----

function shouldGroupWith(
  state: HistoryState,
  tr: Transaction,
  delay: number,
  now: number,
): boolean {
  if (state.prevTime === 0) return false;
  if (now - state.prevTime > delay) return false;

  // Check if ranges overlap (typing continuation)
  if (state.prevRanges) {
    const newRanges = getRangesForTransaction(tr);
    if (newRanges && rangesOverlap(state.prevRanges, newRanges)) {
      return true;
    }
  }

  return false;
}

function getRangesForTransaction(tr: Transaction): number[] | null {
  if (tr.steps.length === 0) return null;
  const ranges: number[] = [];
  for (const step of tr.steps) {
    const map = step.getMap();
    for (let i = 0; i < map.ranges.length; i += 3) {
      ranges.push(map.ranges[i], map.ranges[i] + map.ranges[i + 1]);
    }
  }
  return ranges;
}

function rangesOverlap(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i += 2) {
    for (let j = 0; j < b.length; j += 2) {
      if (a[i] <= b[j + 1] && b[j] <= a[i + 1]) return true;
    }
  }
  return false;
}

function composeMapping(a: Mapping, b: Mapping): Mapping {
  const result = new Mapping();
  for (const map of a.maps) result.appendMap(map);
  for (const map of b.maps) result.appendMap(map);
  return result;
}
